import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import * as config from 'config';
import { ChatCompletionMessageParam } from 'openai/resources';
import { LokiLogger } from 'src/loki/loki-logger/loki-logger.service';

const AI_VERSION = 8;
const AI_DIRECTIONS = `
You are a book classifier.
You will get a list of ISBNs and titles.
Your job is to find the name of the series and (if applicable) the number in it, ONLY from the given book title.
Use the format: "<isbn>#<series_name>#<number>".
If the book is not part of a series, leave empty, but keep the same format.
Do not say anything else.
Answer in one single message.
Keep the given ISBN format and order.
If the title includes the '#' character, remove it.
Return each response in a new line.
If the 'number' of the book is not a number, leave it empty, but keep the title.
`;

export interface BookClassificationInput {
    text: string;
    isbn: string;
}

export interface BookClassificationOutput {
    isbn: string;
    title: string | undefined;
    volume: number | undefined;
    version: number;
}

@Injectable()
export class BookAiService implements OnModuleInit {
    private readonly logger = new LokiLogger(BookAiService.name);

    private OPENAI_API_KEY: string;
    private OPENAI_ENABLED: boolean;
    private client: OpenAI;

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit() {
        this.OPENAI_API_KEY = config.get<string>('openai.key');
        this.OPENAI_ENABLED = this.OPENAI_API_KEY !== '';

        if (!this.OPENAI_ENABLED) {
            return;
        }

        this.client = new OpenAI({
            apiKey: this.OPENAI_API_KEY,
            timeout: 1000 * 30,
        });
    }

    public async classyfyBooks(
        books: BookClassificationInput[],
    ): Promise<BookClassificationOutput[]> {
        if (!this.OPENAI_ENABLED) {
            return books.map((book) => ({
                isbn: book.isbn,
                title: undefined,
                volume: undefined,
                version: 0,
            }));
        }

        const messages = books.map(
            (book): ChatCompletionMessageParam => ({
                role: 'user',
                content: [book.isbn, book.text].join('\n') + '\n',
            }),
        );

        const result = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: AI_DIRECTIONS,
                },
                {
                    role: 'user',
                    content: messages.reduce(
                        (acc, value) => (acc += value.content! + '\n'),
                        '',
                    ),
                },
            ],
        });

        if (result.choices.length === 0) {
            this.logger.error('No classification result.');

            return [];
        }

        const messageContent = result.choices[0].message.content;
        if (!messageContent) {
            this.logger.error('No classification result content.');

            return [];
        }

        if (messageContent.includes('Error:')) {
            this.logger.error(
                `Error while classifying books: ${messageContent}`,
            );
            return [];
        }

        if (messageContent.split('\n').length !== books.length) {
            this.logger.error(
                `Unexpected number of messages in classification result: ${messageContent}`,
            );
            return [];
        }

        if (
            messageContent
                .split('\n')
                .some((line) =>
                    line.split('#').some((part) => part.includes('#')),
                )
        ) {
            this.logger.error(
                `Unexpected format of classification result: ${messageContent}`,
            );
            return [];
        }

        return messageContent.split('\n').map((line) => {
            const [isbn, series, volume] = line.split('#');

            return {
                isbn,
                title: series,
                volume: volume ? parseInt(volume) : undefined,
                version: AI_VERSION,
            };
        });
    }

    public async updateOutdatedClassifications(n: number): Promise<string[]> {
        const books = await this.prisma.book.findMany({
            where: {
                OR: [
                    {
                        usedAiVersion: {
                            equals: null,
                        },
                    },
                    {
                        usedAiVersion: {
                            lt: AI_VERSION,
                        },
                    },
                ],
            },
            take: n,
        });

        this.logger.debug(
            `Updating classifications for ${books.length} books.`,
        );

        if (books.length === 0) {
            return [];
        }

        const booksToClassify: BookClassificationInput[] = books.map(
            (book) => ({
                text: book.title!,
                isbn: book.isbn,
            }),
        );

        const classifications = await this.classyfyBooks(booksToClassify);
        for (const classification of classifications) {
            await this.prisma.book.update({
                where: {
                    isbn: classification.isbn,
                },
                data: {
                    aiSuggestedSeries: classification.title,
                    aiSuggestedVolume: classification.volume,
                    usedAiVersion: classification.version,
                },
            });
        }

        this.logger.log(`Classified ${classifications.length} books.`);

        return classifications.map((classification) => classification.isbn);
    }
}
