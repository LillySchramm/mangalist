import { Injectable } from '@nestjs/common';
import { BooksService } from './books.service';
import { BookGroupingService } from 'src/book-groups/bookGrouping.service';
import { UsersService } from 'src/users/users.service';
import { Cron } from 'src/cron/cron.service';
import { LokiLogger } from 'src/loki/loki-logger/loki-logger.service';
import { BookAiService } from './bookAi.service';

@Injectable()
export class BookTasksService {
    private readonly logger = new LokiLogger(BookTasksService.name);

    constructor(
        private bookService: BooksService,
        private bookGrouping: BookGroupingService,
        private userService: UsersService,
        private bookAiService: BookAiService,
    ) {
        this.logger.log('BookTasksService initialized!');
    }

    @Cron()
    async recrawlCover() {
        const book = await this.bookService.getOneWithRecrawlCoverFlag();
        if (!book) return;

        this.logger.log(`Recrawling cover for book ${book.isbn}...`);

        await this.bookService.scrapeBookCover(book.isbn);
        await this.bookService.setRecrawlCoverFlag(book.isbn, false);

        this.logger.log(`Recrawled cover for book ${book.isbn}!`);
    }

    @Cron()
    async updateOutdatedGrouping() {
        const user = await this.userService.getUserWithOutdatedGroupingFlag();
        if (!user) return;

        this.logger.log(`Updating grouping for user ${user.id}...`);

        await this.bookGrouping.groupBooksOfUser(user.id, true);

        this.logger.log(`Updated grouping for user ${user.id}!`);
    }

    @Cron()
    async recrawlInfo() {
        const book = await this.bookService.getOneWithRecrawlInfoFlag();
        if (!book) return;

        this.logger.log(`Recrawling info for book ${book.isbn}...`);

        await this.bookService.scrapeBookMetaData(book.isbn, true);
        await this.bookService.setRecrawlInfoFlag(book.isbn, false);

        this.logger.log(`Recrawled info for book ${book.isbn}!`);
    }

    @Cron()
    async tryFindCover() {
        const books = await this.bookService.getAllWithoutCover();
        if (!books.length) return;

        const book = books[Math.floor(Math.random() * books.length)];

        this.logger.log(
            `Recrawling cover for book ${book.isbn} because it does not have a cover...`,
        );

        await this.bookService.scrapeBookCover(book.isbn);

        this.logger.log(`Recrawled cover for book ${book.isbn}!`);
    }

    @Cron()
    async doLongruning() {
        const book = await this.bookService.getOneWithLongrunningRecrawlFlag();
        if (!book) return;

        this.logger.log(
            `Recrawling info for book ${book.isbn} because it misses longruning...`,
        );

        await this.bookService.scrapeBookMetaData(book.isbn, true, true);
        await this.bookService.setRecrawlLongrunningFlag(book.isbn, false);

        const users = await this.userService.getAllUserIdsWithBook(book.isbn);
        for (const userId of users) {
            await this.bookGrouping.groupBooksOfUser(userId, true);
        }

        this.logger.log(`Recrawled info for book ${book.isbn}!`);
    }

    @Cron()
    async updateAIClassifications() {
        const isbns =
            await this.bookAiService.updateOutdatedClassifications(10);

        for (const isbn of isbns) {
            const users = await this.userService.getAllUserIdsWithBook(isbn);
            for (const userId of users) {
                await this.bookGrouping.groupBooksOfUser(userId, true);
            }
        }
    }
}
