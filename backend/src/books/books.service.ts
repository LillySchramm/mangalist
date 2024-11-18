import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { VolumeInfo } from './models/volume.model';
import { S3Service } from 'src/s3/s3.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    Book,
    BookCover,
    BookStatus,
    OwnershipStatus,
    User,
} from '@prisma/client';
import { Retryable } from 'typescript-retry-decorator';
import { TesseractService } from 'src/tesseract/tesseract.service';
import { BookWithGroupIdAndAuthors } from './dto/book.dto';
import { AuthorsService } from 'src/authors/authors.service';
import { PublishersService } from 'src/publishers/publishers.service';
import { BookGroupingService } from 'src/book-groups/bookGrouping.service';
import { Scraper } from './scraper/scraper';
import { LokiLogger } from 'src/loki/loki-logger/loki-logger.service';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Magic } from 'mmmagic';

@Injectable()
export class BooksService implements OnModuleInit {
    private readonly logger = new LokiLogger(BooksService.name);

    private coverTextBlacklist: string[] = [
        'No Image Available',
        'Book Cover Not Available',
        'Cover Nicht',
    ];

    constructor(
        private s3: S3Service,
        private prisma: PrismaService,
        private tesseract: TesseractService,
        private authorService: AuthorsService,
        private publisherService: PublishersService,
        private bookGroupingService: BookGroupingService,
        private scraper: Scraper,
        @InjectSentry() private readonly client: SentryService,
    ) {}

    async onModuleInit() {
        await this.addFlagsToAllBooks();
    }

    async addFlagsToAllBooks() {
        const books = await this.prisma.book.findMany({
            select: { isbn: true },
            where: { BookFlags: { is: null } },
        });

        for await (const book of books) {
            await this.prisma.bookFlags.create({
                data: { bookIsbn: book.isbn },
            });

            this.logger.log('Added flags to book ' + book.isbn);
        }
    }

    async doesBookExist(isbn: string) {
        const book = await this.prisma.book.findFirst({
            where: { isbn },
            select: { isbn: true },
        });

        return book !== null;
    }

    async upsertBook(book: VolumeInfo, isbn: string, update = false) {
        if (!book.publisher) {
            book.publisher = 'Unknown';
        }

        const data = {
            isbn,
            title: book.title,
            subtitle: book.subtitle,
            description: book.description,
            publisher: {
                connect: {
                    name: book.publisher,
                },
            },
            series: book.series,
            language: book.language,
            pageCount: book.pageCount,
            printedPageCount: book.printedPageCount,
            publishedDate: book.publishedDate,
            amazonLink: book.amazonLink,
            authors: {
                connect: (book.authors || []).map((name) => ({ name })),
            },
            BookFlags: {
                create: {
                    recrawlLongruning: book.incomplete,
                },
            },
        };

        book.authors = book.authors ? book.authors : [];
        for (const name of book.authors) {
            await this.authorService.upsertAuthor(name);
        }

        if (book.publisher) {
            await this.publisherService.upsertPublisher(book.publisher);
        }

        const bookExists = await this.doesBookExist(isbn);
        if (bookExists) {
            if (!update) return;

            this.logger.log('Updating book ' + isbn);

            await this.prisma.book.update({
                where: { isbn },
                data: { authors: { set: [] } },
            });

            return await this.prisma.book.update({
                where: { isbn },
                data: { ...data, BookFlags: undefined },
            });
        }

        this.logger.log('Creating book ' + isbn);

        return await this.prisma.book.create({
            data,
        });
    }

    async getBookByIsbn(
        isbn: string,
        userId: string,
    ): Promise<BookWithGroupIdAndAuthors | null> {
        return await this.prisma.book.findFirst({
            where: { isbn },
            include: {
                OwnershipStatus: {
                    where: { userId },
                    select: {
                        bookGroupId: true,
                        hidden: true,
                        noGroup: true,
                        favorite: true,
                        createdAt: true,
                    },
                },
                authors: {
                    select: { id: true },
                },
            },
        });
    }

    async saveCoverImage(
        origin: string,
        imageData: Buffer,
    ): Promise<BookCover> {
        const cover = await this.prisma.bookCover.create({ data: { origin } });

        await this.s3.putObject(
            this.s3.bucketName,
            'thumbnails/' + cover.id + '.png',
            imageData,
        );

        return cover;
    }

    async setBookCover(isbn: string, imageId: string | null) {
        await this.prisma.book.update({
            where: { isbn },
            data: { bookCoverId: imageId },
        });
    }

    async getBook(
        isbn: string,
        userId: string,
        crawl = true,
    ): Promise<BookWithGroupIdAndAuthors | null> {
        const existingBook = await this.getBookByIsbn(isbn, userId);
        if (existingBook !== null) return existingBook;
        if (!crawl) return null;

        let metadata: VolumeInfo | undefined;
        try {
            metadata = await this.scrapeBookMetaData(isbn);
        } catch (e) {
            // I know this looks ugly, but it's the only way to check if the
            // error is a NotFoundException because it gets obfuscated by the
            // retry decorator TODO: Fix this
            if (
                e.message &&
                e.message.includes('Could not find book with ISBN')
            )
                return null;

            this.client.instance().captureException(e);
            throw new InternalServerErrorException();
        }

        await this.scrapeBookCover(isbn, metadata);

        return await this.getBookByIsbn(isbn, userId);
    }

    @Retryable({ maxAttempts: 3, backOff: 1000 })
    async scrapeBookMetaData(
        isbn: string,
        update = false,
        longruning = false,
    ): Promise<VolumeInfo> {
        const book = await this.scraper.scrapeBookMetaData(isbn, longruning);
        if (book.title === undefined) {
            throw new NotFoundException(
                'Could not find book with ISBN ' + isbn,
            );
        }
        await this.upsertBook(book, isbn, update);

        return book;
    }

    async trySettingCover(
        isbn: string,
        url: string,
        buffer: Buffer | null,
    ): Promise<boolean> {
        if (buffer === null) return false;

        const type: string | string[] = await new Promise((resolve) => {
            const magic = new Magic();
            magic.detect(buffer as Buffer, (_, result) => resolve(result));
        });

        if (
            !type.includes('JPEG') ||
            type.includes('Premature') ||
            type === 'data'
        ) {
            await this.setBookCover(isbn, null);

            return false;
        }

        const onBlacklist = await this.doesCoverContainBlacklistedWord(buffer);
        if (onBlacklist) {
            await this.setBookCover(isbn, null);

            return false;
        }

        const cover = await this.saveCoverImage(url, buffer);
        await this.setBookCover(isbn, cover.id);

        return true;
    }

    async scrapeBookCover(isbn: string, metadata?: VolumeInfo) {
        const imageCandidates = await this.scraper.scrapeBookCover(
            isbn,
            metadata,
        );

        for await (const blob of imageCandidates) {
            const success = await this.trySettingCover(
                isbn,
                blob.url,
                blob.buffer,
            );
            if (success) break;
        }
    }

    async doesCoverContainBlacklistedWord(buffer: Buffer): Promise<boolean> {
        let text = await this.tesseract.recognizeText(buffer);
        text = text.toLocaleLowerCase();
        text = text.replaceAll(' ', '').replaceAll('\n', '');

        for await (let item of this.coverTextBlacklist) {
            item = item.toLocaleLowerCase();
            item = item.replaceAll(' ', '').replaceAll('\n', '');

            if (text.includes(item)) {
                return true;
            }
        }

        return false;
    }

    async setBookOwnership(
        user: User,
        book: Book,
        status: BookStatus,
        bookGroupId: string | null = null,
        hidden: boolean | undefined,
        noGroup: boolean | undefined,
    ): Promise<OwnershipStatus> {
        if (status === BookStatus.NONE) {
            bookGroupId = null;
        }

        const ownership = await this.prisma.ownershipStatus.upsert({
            where: {
                // eslint-disable-next-line camelcase
                userId_bookIsbn: { bookIsbn: book.isbn, userId: user.id },
            },
            create: {
                status,
                bookIsbn: book.isbn,
                userId: user.id,
                bookGroupId,
                hidden,
                noGroup,
            },
            update: { status, bookGroupId, hidden, noGroup },
        });

        await this.bookGroupingService.groupBooksOfUser(user.id, true);

        return ownership;
    }

    async setMultipleBookOwnershipStatus(
        isbns: string[],
        hidden: boolean | undefined,
        noGroup: boolean | undefined,
        favorite: boolean | undefined,
        userId: string,
    ): Promise<number> {
        const ownerships = await this.prisma.ownershipStatus.updateMany({
            where: {
                userId,
                bookIsbn: { in: isbns },
            },
            data: { hidden, noGroup, favorite },
        });

        if (noGroup !== undefined) {
            await this.bookGroupingService.groupBooksOfUser(userId, true);
        }

        return ownerships.count;
    }

    async getBookOwnership(user: User, book: Book): Promise<OwnershipStatus> {
        const ownershipStatus = await this.prisma.ownershipStatus.findFirst({
            where: { bookIsbn: book.isbn, userId: user.id },
        });
        if (ownershipStatus !== null) return ownershipStatus;

        return await this.setBookOwnership(
            user,
            book,
            BookStatus.NONE,
            null,
            undefined,
            undefined,
        );
    }

    async getAllOwnedBooksOfUser(
        userId: string,
        includeHidden = true,
    ): Promise<BookWithGroupIdAndAuthors[]> {
        await this.bookGroupingService.groupBooksOfUser(userId);

        return await this.prisma.book.findMany({
            where: {
                OwnershipStatus: {
                    some: {
                        userId,
                        status: BookStatus.OWNED,
                        hidden: includeHidden ? {} : false,
                    },
                },
            },
            include: {
                OwnershipStatus: {
                    where: { userId },
                    select: {
                        bookGroupId: true,
                        hidden: true,
                        noGroup: true,
                        favorite: true,
                        createdAt: true,
                    },
                },
                authors: {
                    select: { id: true },
                },
            },
        });
    }

    async getOneWithRecrawlCoverFlag(): Promise<{ isbn: string } | null> {
        return await this.prisma.book.findFirst({
            select: { isbn: true },
            where: { BookFlags: { recrawlCover: true } },
        });
    }

    async getOneWithLongrunningRecrawlFlag(): Promise<{ isbn: string } | null> {
        return await this.prisma.book.findFirst({
            select: { isbn: true },
            where: { BookFlags: { recrawlLongruning: true } },
        });
    }

    async setRecrawlCoverFlag(isbn: string, value: boolean) {
        await this.prisma.bookFlags.update({
            where: { bookIsbn: isbn },
            data: { recrawlCover: value },
        });
    }

    async getOneWithRecrawlInfoFlag(): Promise<{ isbn: string } | null> {
        return await this.prisma.book.findFirst({
            select: { isbn: true },
            where: { BookFlags: { recrawlInfo: true } },
        });
    }

    async getAllWithoutCover(): Promise<{ isbn: string }[]> {
        return await this.prisma.book.findMany({
            select: { isbn: true },
            where: { bookCoverId: null },
        });
    }

    async setRecrawlInfoFlag(isbn: string, value: boolean) {
        await this.prisma.bookFlags.update({
            where: { bookIsbn: isbn },
            data: { recrawlInfo: value },
        });
    }

    async setRecrawlLongrunningFlag(isbn: string, value: boolean) {
        await this.prisma.bookFlags.update({
            where: { bookIsbn: isbn },
            data: { recrawlLongruning: value },
        });
    }

    async resetUsedAIVersion(isbn: string) {
        await this.prisma.book.update({
            where: { isbn },
            data: { usedAiVersion: 0 },
        });
    }
}
