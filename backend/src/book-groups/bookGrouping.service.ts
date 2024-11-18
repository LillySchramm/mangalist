import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
    Author,
    Book,
    BookStatus,
    OwnershipStatus,
    Publisher,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookGroupsService } from './bookGroups.service';
import * as isbn from 'isbn3';
import * as config from 'config';
import { UsersService } from 'src/users/users.service';
import { cloneDeep, isEqual } from 'lodash';
import { LokiLogger } from 'src/loki/loki-logger/loki-logger.service';
import { removeStopwords, eng, deu } from 'stopword';

type BookWithPublisherAndAuthors = Book & {
    publisher: Publisher | null;
    authors: Author[];
    OwnershipStatus: OwnershipStatus[];
};

export const GROUPING_VERSION = 7;
export const MAX_REGULAR_GROUPING_TRIES = 10;

// If the name of a book is shorter than this, it will not be used for grouping.
// The Lower the number, the more likely are false positives.
export const MIN_NAME_LENGTH_FOR_COMPARISON = 5;
export const MIN_NAME_LENGTH_FOR_GROUP_COMPARISON = 10;

// If the volume number of a book is higher than this, it will likely be a false positive (year).
export const MAX_VOLUME_NUMBER = 500;

export const MIN_GROUP_SIZE = 2;

@Injectable()
export class BookGroupingService {
    private readonly logger = new LokiLogger(BookGroupingService.name);

    private readonly BLACKLISTED_CHUNKS = [
        'vol.',
        'band',
        '-',
        '(finale)',
        'part',
        'bd.',
    ];
    private readonly BLACKLISTED_ENDING_CHARACTERS = [',', '.', ':', '-'];

    constructor(
        private prisma: PrismaService,
        private bookGroup: BookGroupsService,
        @Inject(forwardRef(() => UsersService))
        private userService: UsersService,
    ) {}

    private async getAllRelevantBooksOfUser(
        userId: string,
    ): Promise<BookWithPublisherAndAuthors[]> {
        const books: BookWithPublisherAndAuthors[] =
            await this.prisma.book.findMany({
                where: {
                    OwnershipStatus: {
                        some: { userId, status: BookStatus.OWNED },
                    },
                },
                include: {
                    authors: true,
                    publisher: true,
                    OwnershipStatus: { where: { userId } },
                },
            });

        return books;
    }

    processMapper(
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
        mapperFunction: (book: BookWithPublisherAndAuthors) => string,
    ): Map<string, BookWithPublisherAndAuthors[]> {
        const ungroupedBooks = groupedBooks.get('');
        groupedBooks.set('', []);

        for (const book of ungroupedBooks || []) {
            const bookKey = mapperFunction(book);
            if (!groupedBooks.has(bookKey)) {
                groupedBooks.set(bookKey, []);
            }
            groupedBooks.get(bookKey)!.push(book);
        }

        return groupedBooks;
    }

    groupBooks(
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
    ): Map<string, BookWithPublisherAndAuthors[]> {
        groupedBooks = this.processMapper(
            groupedBooks,
            this.getSeriesName.bind(this),
        );

        groupedBooks = this.processMapper(
            groupedBooks,
            this.getSeriesNameOfBookByVolumeNumber.bind(this),
        );

        groupedBooks = this.processMapper(groupedBooks, (book) =>
            this.getSeriesNameOfBookByExactMatch(
                book,
                Array.from(groupedBooks.keys()),
            ),
        );

        const ungroupedBookTitles = groupedBooks
            .get('')!
            .map((book) => book.title || '');

        groupedBooks = this.processMapper(groupedBooks, (book) =>
            this.getSeriesNameOfBookByMultipleWithSameName(
                book,
                ungroupedBookTitles,
            ),
        );

        groupedBooks = this.processMapper(groupedBooks, (book) =>
            this.getSeriesNameOfBookByContainsFoundSeries(
                book,
                Array.from(groupedBooks.keys()),
            ),
        );

        groupedBooks = this.deduplicateGroups(groupedBooks);

        groupedBooks = this.removeToSmallGroups(groupedBooks);

        return groupedBooks;
    }

    private getSeriesName(book: BookWithPublisherAndAuthors): string {
        return book.series || book.aiSuggestedSeries || '';
    }

    private findSimilarGroupNames(
        groupName: string,
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
    ): string[] {
        const cleanGroupName = this.cleanUpString(groupName);
        return Array.from(groupedBooks.keys()).filter((otherGroupName) => {
            const cleanOtherGroupName = this.cleanUpString(otherGroupName);

            if (
                cleanGroupName.length < MIN_NAME_LENGTH_FOR_COMPARISON ||
                cleanOtherGroupName.length < MIN_NAME_LENGTH_FOR_COMPARISON
            )
                return false;

            return (
                cleanOtherGroupName.includes(cleanGroupName) ||
                cleanGroupName.includes(cleanOtherGroupName)
            );
        });
    }

    private findMostLikelyGroupName(
        similarGroupNames: string[],
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
    ): string {
        const similarGroupMapArray = similarGroupNames.map(
            (similarGroupName) => {
                return {
                    name: similarGroupName,
                    books: groupedBooks.get(similarGroupName) || [],
                };
            },
        );
        const sortedSimilarGroupMapArray = similarGroupMapArray.sort((a, b) => {
            if (a.books.length === b.books.length) {
                return a.name.length - b.name.length;
            }

            return b.books.length - a.books.length;
        });

        return sortedSimilarGroupMapArray[0].name;
    }

    // If a book is the only book in a group and the title does not end with a number,
    // it is most likely not part of a series and/or a false positive.
    private removeToSmallGroups(
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
    ): Map<string, BookWithPublisherAndAuthors[]> {
        const soloGroups = Array.from(groupedBooks.keys()).filter(
            (groupName) => {
                const books = groupedBooks.get(groupName) || [];
                return books.length < MIN_GROUP_SIZE && groupName;
            },
        );

        const ungroupedBooks = groupedBooks.get('') || [];
        groupedBooks.set('', ungroupedBooks);

        for (const soloGroup of soloGroups) {
            const books = groupedBooks.get(soloGroup) || [];
            groupedBooks.get('')!.push(...books);
            groupedBooks.delete(soloGroup);
        }

        return groupedBooks;
    }

    private deduplicateGroups(
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
    ): Map<string, BookWithPublisherAndAuthors[]> {
        const deduplicatedGroups = new Map<
            string,
            BookWithPublisherAndAuthors[]
        >();

        for (const [groupName] of groupedBooks) {
            if (groupName === '') {
                deduplicatedGroups.set('', groupedBooks.get('') || []);
                continue;
            }

            const similarGroupNames = this.findSimilarGroupNames(
                groupName,
                groupedBooks,
            );

            if (similarGroupNames.length === 0) {
                deduplicatedGroups.set(groupName, groupedBooks.get(groupName)!);
                continue;
            }

            const mostLikelyGroupName = this.findMostLikelyGroupName(
                similarGroupNames,
                groupedBooks,
            );

            if (deduplicatedGroups.has(mostLikelyGroupName)) continue;

            const allBooks: BookWithPublisherAndAuthors[] = [];
            for (const similarGroupMap of similarGroupNames) {
                const allBooksOfSimilarGroup =
                    groupedBooks.get(similarGroupMap) || [];

                allBooks.push(...allBooksOfSimilarGroup);
            }

            deduplicatedGroups.set(mostLikelyGroupName, allBooks);
        }

        return deduplicatedGroups;
    }

    async groupBooksOfUser(userId: string, force: boolean = false) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            include: { UserFlags: true },
        });
        if (!user || !user.UserFlags) return;

        if (
            !force &&
            user.UserFlags.lastAppliedGrouperVersion >= GROUPING_VERSION &&
            !config.get<boolean>('debug.always_regroup')
        )
            return;

        this.logger.log(`Grouping books of user ${userId}... Forced: ${force}`);

        const books = await this.getAllRelevantBooksOfUser(userId);
        const booksWithNoGroupFlag = books.filter(
            (book) => book.OwnershipStatus[0].noGroup,
        );
        const booksWithoutNoGroupFlag = books.filter(
            (book) => !book.OwnershipStatus[0].noGroup,
        );

        let groupedBooks = new Map<string, BookWithPublisherAndAuthors[]>();
        groupedBooks.set('', booksWithoutNoGroupFlag);

        for (let i = 0; i < MAX_REGULAR_GROUPING_TRIES; i++) {
            const newGrouping = this.groupBooks(cloneDeep(groupedBooks));

            const newGroupingKeys = Array.from(newGrouping.keys()).sort();
            const oldGroupingKeys = Array.from(groupedBooks.keys()).sort();
            const newUngroupedBooks = newGrouping.get('') || [];
            const oldUngroupedBooks = groupedBooks.get('') || [];

            if (
                isEqual(oldGroupingKeys, newGroupingKeys) &&
                newUngroupedBooks.length === oldUngroupedBooks.length
            ) {
                groupedBooks = newGrouping;
                this.logger.debug(
                    `Grouping of user ${userId} converged after ${i} iterations.`,
                );
                break;
            }
            groupedBooks = newGrouping;
        }

        groupedBooks.set('', [
            ...(groupedBooks.get('') || []),
            ...booksWithNoGroupFlag,
        ]);

        this.logger.debug(
            `Grouping of user ${userId} finished with ${
                groupedBooks.get('')?.length
            } unassigned.`,
        );

        await this.saveBookGroupMap(groupedBooks, userId);
    }

    private async saveBookGroupMap(
        groupedBooks: Map<string, BookWithPublisherAndAuthors[]>,
        userId: string,
    ) {
        const bookGroups =
            await this.bookGroup.getAllBookGroupsOfUserWithOwnershipStatus(
                userId,
            );
        const bookGroupNames = new Map<string, string>(
            bookGroups.map((bookGroup) => [bookGroup.name, bookGroup.id]),
        );
        const bookGroupItems = new Map<string, string[]>(
            bookGroups.map((bookGroup) => [
                bookGroup.id,
                bookGroup.OwnershipStatus.map(
                    (ownershipStatus) => ownershipStatus.bookIsbn,
                ),
            ]),
        );
        const allUnassignedBooks =
            await this.bookGroup.getAllUnassignedBooksOfUser(userId);
        const allUnassignedBookIsbns = allUnassignedBooks.map(
            (ownershipStatus) => ownershipStatus.bookIsbn,
        );

        for await (const [bookGroupName, books] of groupedBooks) {
            if (!bookGroupName) {
                for await (const book of books) {
                    if (allUnassignedBookIsbns.includes(book.isbn)) continue;

                    await this.prisma.ownershipStatus.update({
                        where: {
                            // eslint-disable-next-line camelcase
                            userId_bookIsbn: { userId, bookIsbn: book.isbn },
                        },
                        data: { bookGroupId: null },
                    });
                }
                continue;
            }

            if (!bookGroupNames.has(bookGroupName)) {
                const newBookGroup = await this.bookGroup.createBookGroup(
                    bookGroupName,
                    userId,
                );
                bookGroupNames.set(newBookGroup.name, newBookGroup.id);
            }

            const bookGroupId = bookGroupNames.get(bookGroupName)!;
            const bookGroupItemIsbns = bookGroupItems.get(bookGroupId) || [];
            for await (const book of books) {
                if (bookGroupItemIsbns.includes(book.isbn)) continue;

                await this.prisma.ownershipStatus.update({
                    // eslint-disable-next-line camelcase
                    where: { userId_bookIsbn: { userId, bookIsbn: book.isbn } },
                    data: { bookGroupId },
                });
            }
        }

        await this.bookGroup.deleteEmptyBookGroupsOfUser(userId);
        await this.userService.updateUserGroupingVersionFlag(
            userId,
            GROUPING_VERSION,
        );
    }

    /**
        Tries to determine the series name by looking at the title of the book
        and looking for patterns that indicate that the book is part of a series. (e.g. "Vol. 1")
     */
    private getSeriesNameOfBookByVolumeNumber(
        book: BookWithPublisherAndAuthors,
    ): string {
        if (!book.title) return '';

        let titleChunks = book.title.split(' ');
        titleChunks = titleChunks.filter(
            (chunk) => !this.BLACKLISTED_CHUNKS.includes(chunk.toLowerCase()),
        );

        const titleWithoutBlacklistedChunks = titleChunks.join(' ');

        const numbers = titleChunks.filter((chunk) =>
            this.isStringNumeric(chunk),
        );
        titleChunks = titleChunks
            .filter((chunk) => !this.isStringNumeric(chunk))
            .filter((chunk) => !!chunk);

        if (
            !titleChunks.length ||
            Number.parseInt(numbers[numbers.length - 1]) > MAX_VOLUME_NUMBER
        )
            return '';

        const titleEndsWithNumber =
            numbers.length &&
            titleWithoutBlacklistedChunks.endsWith(numbers[numbers.length - 1]);
        const titleEndsWithBlacklistedCharacter =
            this.BLACKLISTED_ENDING_CHARACTERS.includes(
                titleChunks[titleChunks.length - 1].at(-1) || '',
            );

        if (
            titleChunks.length &&
            (titleEndsWithNumber || numbers.length === 1) &&
            !titleEndsWithBlacklistedCharacter
        )
            return titleChunks.join(' ');

        return '';
    }

    /**
     * Tries to determine the series name by looking for an exact match of
     * the book title with the series names of the other books.
     */
    private getSeriesNameOfBookByExactMatch(
        book: Book,
        currentSeriesNames: string[],
    ): string {
        if (book.title === null) return '';

        const cleanedBookTitle = this.cleanUpString(book.title);

        return (
            currentSeriesNames.find(
                (seriesName) =>
                    this.cleanUpString(seriesName) === cleanedBookTitle ||
                    (this.cleanUpString(seriesName).includes(
                        cleanedBookTitle,
                    ) &&
                        cleanedBookTitle.length >
                            MIN_NAME_LENGTH_FOR_COMPARISON),
            ) || ''
        );
    }

    /**
     * Tries to determine the series name by looking for an found series name
     * which contains the book title.
     */
    private getSeriesNameOfBookByContainsFoundSeries(
        book: Book,
        currentSeriesNames: string[],
    ): string {
        const parsedIsbn = isbn.parse(book.isbn);

        if (book.title === null || parsedIsbn === null) return '';

        return (
            currentSeriesNames.find((seriesName) => {
                if (seriesName === '') return false;

                const cleanedSeriesName = this.cleanUpString(seriesName);
                const cleanedBookTitle = this.cleanUpString(book.title!);

                const contained =
                    cleanedSeriesName.includes(cleanedBookTitle) ||
                    cleanedBookTitle.includes(cleanedSeriesName);

                const closeContains =
                    (cleanedBookTitle.length >
                        MIN_NAME_LENGTH_FOR_GROUP_COMPARISON &&
                        cleanedSeriesName.includes(cleanedBookTitle)) ||
                    (cleanedSeriesName.length >
                        MIN_NAME_LENGTH_FOR_GROUP_COMPARISON &&
                        cleanedBookTitle.includes(cleanedSeriesName));

                return contained || closeContains;
            }) || ''
        );
    }

    private cleanUpString(str: string, join: string = ''): string {
        const cleanedString = str
            .toLowerCase()
            .replaceAll(/\([^\)]+\)/g, '')
            .replaceAll(/[^a-z0-9\s]/g, '');

        const chunks = cleanedString.split(' ');
        const stopwordFree = removeStopwords(chunks, [...eng, ...deu]);

        return stopwordFree.join(join);
    }

    /**
     * Tries to determine the series name by looking for an exact match with at least one other unassigned book.
     */
    private getSeriesNameOfBookByMultipleWithSameName(
        book: BookWithPublisherAndAuthors,
        allUnassignedBookNames: string[],
    ): string {
        if (book.title === null) return '';

        const bookTitle = this.cleanUpString(book.title);
        const otherBooksWithSameName = allUnassignedBookNames.filter(
            (otherBookName) => this.cleanUpString(otherBookName) === bookTitle,
        );

        if (otherBooksWithSameName.length > 1) return book.title;

        return '';
    }

    private isStringNumeric(str: string): boolean {
        str = str.toLowerCase();
        for (const blacklistedChunk of this.BLACKLISTED_CHUNKS) {
            str = str.replaceAll(blacklistedChunk, '');
        }
        // Removing all colons and commas because they are often used to indicate a sub-title
        // eg. "Vol. 1: The Beginning"
        for (const blacklistedCharacter of this.BLACKLISTED_ENDING_CHARACTERS) {
            str = str.replaceAll(blacklistedCharacter, '');
        }

        return /^\d*$/.test(str);
    }
}
