import {
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
    ServiceUnavailableException,
} from '@nestjs/common';

import { gotScraping } from 'got-scraping';
import {
    GoogleBookResponse,
    GoogleVolume,
    GoogleVolumeInfo,
} from './models/googleVolume.model';
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
import { Magic } from 'mmmagic';
import { BookWithGroupIdAndAuthors } from './dto/book.dto';
import { AuthorsService } from 'src/authors/authors.service';
import { PublishersService } from 'src/publishers/publishers.service';
import { BookGroupingService } from 'src/book-groups/bookGrouping.service';

interface CoverCrawlResult {
    buffer: Buffer | null;
    url: string;
}

@Injectable()
export class BooksService implements OnModuleInit {
    private readonly logger = new Logger(S3Service.name);

    private bookApiBase = 'https://www.googleapis.com/books/v1/volumes';
    private bookCoverBase = 'https://images.isbndb.com/covers';

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

    async upsertBook(book: GoogleVolumeInfo, isbn: string) {
        const bookExists = await this.doesBookExist(isbn);
        if (bookExists) return;

        book.authors = book.authors ? book.authors : [];
        for (const name of book.authors) {
            await this.authorService.upsertAuthor(name);
        }

        if (book.publisher) {
            await this.publisherService.upsertPublisher(book.publisher);
        }

        await this.prisma.book.create({
            data: {
                isbn,
                title: book.title,
                subtitle: book.subtitle,
                description: book.description,
                publisher: {
                    connect: {
                        name: book.publisher,
                    },
                },
                language: book.language,
                pageCount: book.pageCount,
                printedPageCount: book.printedPageCount,
                publishedDate: book.publishedDate,
                authors: {
                    connect: book.authors.map((name) => ({ name })),
                },
                BookFlags: {
                    create: {},
                },
            },
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
                    select: { bookGroupId: true },
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
    ): Promise<BookWithGroupIdAndAuthors | null> {
        const existingBook = await this.getBookByIsbn(isbn, userId);
        if (existingBook !== null) return existingBook;

        const metadata = await this.scrapeBookMetaData(isbn);
        await this.scrapeBookCover(isbn, metadata);

        return await this.getBookByIsbn(isbn, userId);
    }

    @Retryable({ maxAttempts: 3, backOff: 1000 })
    async scrapeBookMetaData(isbn: string): Promise<GoogleVolumeInfo> {
        const googleBookResponse = await gotScraping.get(
            this.bookApiBase + '?q=isbn:' + isbn,
        );

        const googleBookData: GoogleBookResponse = JSON.parse(
            googleBookResponse.body,
        );

        if (googleBookResponse.statusCode === 429) {
            throw new ServiceUnavailableException();
        }

        if (
            googleBookResponse.statusCode !== 200 ||
            googleBookData.totalItems === 0
        ) {
            throw new NotFoundException();
        }

        const book: GoogleVolume = await gotScraping
            .get(googleBookData.items[0].selfLink)
            .json();

        await this.upsertBook(book.volumeInfo, isbn);

        return googleBookData.items[0].volumeInfo;
    }

    async scrapeBookCoverFromIsbnDb(isbn: string): Promise<CoverCrawlResult> {
        const isbndbUrl = `${this.bookCoverBase}/${isbn.substring(
            isbn.length - 4,
            isbn.length - 2,
        )}/${isbn.substring(isbn.length - 2, isbn.length)}/${isbn}.jpg`;

        const isbndbImage = await gotScraping.get(isbndbUrl);
        if (isbndbImage.statusCode === 200) {
            return { buffer: isbndbImage.rawBody, url: isbndbUrl };
        }

        return { buffer: null, url: isbndbUrl };
    }

    async scrapeBookCoverFromGoogle(
        metadata: GoogleVolumeInfo,
    ): Promise<CoverCrawlResult> {
        if (!metadata.imageLinks || !metadata.imageLinks.thumbnail) {
            const googleBookResponseFromTitle: GoogleBookResponse =
                await gotScraping
                    .get(this.bookApiBase + '?q=title:' + metadata.title)
                    .json();

            const bookWithSameTitle = googleBookResponseFromTitle.items.find(
                (book) => book.volumeInfo.title.startsWith(metadata.title),
            );

            if (
                !bookWithSameTitle ||
                !bookWithSameTitle.volumeInfo.imageLinks ||
                !bookWithSameTitle.volumeInfo.imageLinks.thumbnail
            ) {
                return { buffer: null, url: '' };
            }

            metadata.imageLinks = bookWithSameTitle.volumeInfo.imageLinks;
        }

        const googleImage = await gotScraping.get(
            metadata.imageLinks.thumbnail!,
        );
        if (googleImage.statusCode === 200) {
            return {
                buffer: googleImage.rawBody,
                url: metadata.imageLinks.thumbnail!,
            };
        }

        return { buffer: null, url: metadata.imageLinks.thumbnail! };
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

    async scrapeBookCover(isbn: string, metadata?: GoogleVolumeInfo) {
        const isbnDbImage = await this.scrapeBookCoverFromIsbnDb(isbn);

        if (!metadata) {
            metadata = await this.scrapeBookMetaData(isbn);
        }
        const googleImage = await this.scrapeBookCoverFromGoogle(metadata);

        for await (const blob of [isbnDbImage, googleImage]) {
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
            },
            update: { status, bookGroupId },
        });

        if (status === BookStatus.OWNED) {
            await this.bookGroupingService.groupBooksOfUser(user.id, true);
        }

        return ownership;
    }

    async getBookOwnership(user: User, book: Book): Promise<OwnershipStatus> {
        const ownershipStatus = await this.prisma.ownershipStatus.findFirst({
            where: { bookIsbn: book.isbn, userId: user.id },
        });
        if (ownershipStatus !== null) return ownershipStatus;

        return await this.setBookOwnership(user, book, BookStatus.NONE);
    }

    async getAllOwnedBooksOfUser(
        userId: string,
    ): Promise<BookWithGroupIdAndAuthors[]> {
        await this.bookGroupingService.groupBooksOfUser(userId);

        return await this.prisma.book.findMany({
            where: {
                OwnershipStatus: { some: { userId, status: BookStatus.OWNED } },
            },
            include: {
                OwnershipStatus: {
                    where: { userId },
                    select: { bookGroupId: true },
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

    async setRecrawlCoverFlag(isbn: string, value: boolean) {
        await this.prisma.bookFlags.update({
            where: { bookIsbn: isbn },
            data: { recrawlCover: value },
        });
    }
}
