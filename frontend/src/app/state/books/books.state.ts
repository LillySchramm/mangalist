import { Injectable } from '@angular/core';
import {
    Action,
    Selector,
    State,
    StateContext,
    createSelector,
} from '@ngxs/store';
import { catchError, tap } from 'rxjs';
import {
    BookDto,
    BookGroupDto,
    BookGroupsService,
    BooksService,
} from 'src/app/api';
import { SnackBarService } from 'src/app/common/services/snack-bar.service';
import { AuthorActions } from '../authors/author.actions';
import { PublisherActions } from '../publisher/publisher.actions';
import { BookActions } from './books.actions';

export interface BookMap {
    [key: string]: BookDto;
}

export interface BookGroupMap {
    [key: string]: BookGroupDto;
}

interface BookStateModel {
    selectedBook?: string;
    selectedFavorite: boolean;
    currentCollection?: string[];
    bookMap: BookMap;
    currentOwnerId?: string;
    loadingCollection: boolean;
    loadingCollectionError?: string;
    currentGroupMap?: BookGroupMap;
    loadingGroups: boolean;
    loadingGroupsError?: string;
    searchResult?: string;
    searchError?: string;
    searchLoading: boolean;
    ownershipChangeLoading: boolean;
    filter?: string;
    authorFilter?: string[];
    publisherFilter?: string[];
    languageFilter?: string[];
    recentFilter: boolean;
}

@State<BookStateModel>({
    name: 'books',
    defaults: {
        loadingCollection: false,
        loadingGroups: false,
        searchLoading: false,
        ownershipChangeLoading: false,
        selectedFavorite: false,
        recentFilter: false,
        bookMap: {},
    },
})
@Injectable()
export class BooksState {
    constructor(
        private bookApi: BooksService,
        private bookGroupApi: BookGroupsService,
        private snack: SnackBarService,
    ) {}

    @Action(BookActions.LoadBooksOfUser)
    loadBooksOfUser(
        { patchState, getState, dispatch }: StateContext<BookStateModel>,
        { id }: BookActions.LoadBooksOfUser,
    ) {
        const state = getState();

        if (state.currentOwnerId !== id) {
            patchState({
                selectedBook: undefined,
                currentCollection: undefined,
                currentOwnerId: id,
            });
        }

        patchState({
            loadingCollection: true,
            loadingCollectionError: undefined,
        });

        return this.bookApi.booksControllerGetAllOwnedBooks(id).pipe(
            tap((books) =>
                dispatch(new BookActions.LoadBooksOfUserSuccess(books)),
            ),
            catchError((error) =>
                dispatch(new BookActions.LoadBooksOfUserFail(error)),
            ),
        );
    }

    @Action(BookActions.LoadBooksOfUserSuccess)
    loadBooksOfUserSuccess(
        { patchState, dispatch, getState }: StateContext<BookStateModel>,
        { books }: BookActions.LoadBooksOfUserSuccess,
    ) {
        const state = getState();
        const bookMap = state.bookMap;

        books.books.forEach((book) => (bookMap[book.isbn] = book));

        const publisherIds = books.books.map((book) => book.publisherId || '');
        dispatch(
            new PublisherActions.LoadPublishers(
                Array.from(new Set(publisherIds).values()),
            ),
        );

        const authorIds = books.books.flatMap((book) =>
            book.authors.map((author) => author.id),
        );
        dispatch(
            new AuthorActions.LoadAuthors(
                Array.from(new Set(authorIds).values()),
            ),
        );

        dispatch(
            new BookActions.LoadBookGroupsOfUser(state.currentOwnerId || ''),
        );

        patchState({
            currentCollection: books.books.map((book) => book.isbn),
            loadingCollectionError: undefined,
            loadingCollection: false,
            bookMap: bookMap,
        });
    }

    @Action(BookActions.LoadBooksOfUserFail)
    loadBooksOfUserFail(
        { patchState }: StateContext<BookStateModel>,
        { error }: BookActions.LoadBooksOfUserFail,
    ) {
        patchState({
            currentCollection: undefined,
            loadingCollectionError: error,
            loadingCollection: false,
        });
    }

    @Action(BookActions.LoadBookGroupsOfUser)
    loadBookGroupsOfUser(
        { patchState, getState, dispatch }: StateContext<BookStateModel>,
        { id }: BookActions.LoadBookGroupsOfUser,
    ) {
        const state = getState();

        if (state.currentOwnerId !== id) {
            patchState({
                selectedBook: undefined,
                currentGroupMap: undefined,
                currentOwnerId: id,
            });
        }

        patchState({
            loadingGroups: true,
            loadingGroupsError: undefined,
        });

        return this.bookGroupApi.bookGroupsControllerGetAllBookGroups(id).pipe(
            tap((groups) =>
                dispatch(new BookActions.LoadBookGroupsOfUserSuccess(groups)),
            ),
            catchError((error) =>
                dispatch(new BookActions.LoadBookGroupsOfUserFail(error)),
            ),
        );
    }

    @Action(BookActions.LoadBookGroupsOfUserSuccess)
    loadBookGroupsOfUserSuccess(
        { patchState }: StateContext<BookStateModel>,
        { groups }: BookActions.LoadBookGroupsOfUserSuccess,
    ) {
        const groupMap: BookGroupMap = {};
        groups.groups.forEach((group) => (groupMap[group.id] = group));

        patchState({
            currentGroupMap: groupMap,
            loadingGroupsError: undefined,
            loadingGroups: false,
        });
    }

    @Action(BookActions.LoadBookGroupsOfUserFail)
    loadBookGroupsOfUserFail(
        { patchState }: StateContext<BookStateModel>,
        { error }: BookActions.LoadBookGroupsOfUserFail,
    ) {
        patchState({
            currentGroupMap: undefined,
            loadingGroupsError: error,
            loadingGroups: false,
        });
    }

    @Action(BookActions.SelectBook)
    selectBook(
        { patchState }: StateContext<BookStateModel>,
        { id, favorite }: BookActions.SelectBook,
    ) {
        patchState({
            selectedBook: id,
            selectedFavorite: favorite,
        });
    }

    @Action(BookActions.SearchBooks)
    searchBooks(
        { patchState, dispatch }: StateContext<BookStateModel>,
        { isbn, skipCrawl }: BookActions.SearchBooks,
    ) {
        patchState({
            searchLoading: true,
            searchError: undefined,
            searchResult: undefined,
        });

        return this.bookApi.booksControllerGetBook(isbn, skipCrawl).pipe(
            tap((book) => dispatch(new BookActions.SearchBooksSuccess(book))),
            catchError((error) =>
                dispatch(new BookActions.SearchBooksFail(error)),
            ),
        );
    }

    @Action(BookActions.SearchBooksSuccess)
    searchBooksSuccess(
        { patchState, getState, dispatch }: StateContext<BookStateModel>,
        { book }: BookActions.SearchBooksSuccess,
    ) {
        patchState({
            searchLoading: false,
            bookMap: {
                ...getState().bookMap,
                [book.isbn]: book,
            },
            searchResult: book.isbn,
        });

        if (book.publisherId) {
            dispatch(new PublisherActions.LoadPublishers([book.publisherId]));
        }

        const authorIds = book.authors.map((author) => author.id);
        dispatch(new AuthorActions.LoadAuthors(authorIds));
    }

    @Action(BookActions.SearchBooksFail)
    searchBooksFail(
        { patchState }: StateContext<BookStateModel>,
        { error }: BookActions.SearchBooksFail,
    ) {
        patchState({
            searchLoading: false,
            searchError: error.message,
        });

        if (error.status === 404) {
            this.snack.show('No book found with this ISBN');

            return;
        }

        this.snack.show(
            'Something went wrong on our side. Please try again in a few minutes.',
        );
    }

    @Action(BookActions.ChangeOwnership)
    changeOwnership(
        { patchState, getState, dispatch }: StateContext<BookStateModel>,
        { bookId, payload }: BookActions.ChangeOwnership,
    ) {
        const state = getState();
        const ownedBooks = state.currentCollection || [];

        if (payload.status === 'NONE' && ownedBooks.includes(bookId)) {
            ownedBooks.splice(ownedBooks.indexOf(bookId), 1);
        }

        if (payload.status !== 'NONE' && !ownedBooks.includes(bookId)) {
            ownedBooks.push(bookId);
        }

        patchState({
            ownershipChangeLoading: true,
            currentCollection: ownedBooks,
        });

        return this.bookApi
            .booksControllerSetBookOwnershipStatus(bookId, payload)
            .pipe(
                tap(() => {
                    dispatch(
                        new BookActions.LoadBooksOfUser(
                            state.currentOwnerId || '',
                        ),
                    );
                    dispatch(
                        new BookActions.ChangeOwnershipSuccess(
                            payload.status === 'OWNED',
                        ),
                    );
                }),
            );
    }

    @Action(BookActions.ChangeOwnershipSuccess)
    changeOwnershipSuccess(
        { patchState }: StateContext<BookStateModel>,
        { added }: BookActions.ChangeOwnershipSuccess,
    ) {
        if (added) {
            this.snack.show('Book added to your collection!');
        }

        patchState({
            ownershipChangeLoading: false,
        });
    }

    @Action(BookActions.SetFilter)
    setFilter(
        { patchState }: StateContext<BookStateModel>,
        { filter }: BookActions.SetFilter,
    ) {
        patchState({
            filter: filter,
        });
    }

    @Action(BookActions.SetAuthorFilter)
    setAuthorFilter(
        { patchState }: StateContext<BookStateModel>,
        { authorIds }: BookActions.SetAuthorFilter,
    ) {
        patchState({
            authorFilter: authorIds,
        });
    }

    @Action(BookActions.SetPublisherFilter)
    setPublisherFilter(
        { patchState }: StateContext<BookStateModel>,
        { publisherIds }: BookActions.SetPublisherFilter,
    ) {
        patchState({
            publisherFilter: publisherIds,
        });
    }

    @Action(BookActions.SetLanguageFilter)
    setLanguageFilter(
        { patchState }: StateContext<BookStateModel>,
        { languageIds }: BookActions.SetLanguageFilter,
    ) {
        patchState({
            languageFilter: languageIds,
        });
    }

    @Action(BookActions.SetRecentFilter)
    setRecentFilter(
        { patchState }: StateContext<BookStateModel>,
        { recent }: BookActions.SetRecentFilter,
    ) {
        patchState({
            recentFilter: recent,
        });
    }

    @Action(BookActions.UpdateBookVisibility)
    updateBookVisibility(
        { getState, dispatch, patchState }: StateContext<BookStateModel>,
        { isbns, visible }: BookActions.UpdateBookVisibility,
    ) {
        const state = getState();

        for (const isbn of isbns) {
            state.bookMap[isbn].hidden = !visible;
        }

        patchState({ bookMap: state.bookMap });

        return this.bookApi
            .booksControllerSetBookOwnershipFlags({ isbns, hidden: !visible })
            .pipe(
                tap(() => {
                    dispatch(new BookActions.UpdateBookSuccess());
                }),
            );
    }

    @Action(BookActions.UpdatedBookGrouping)
    updateBookGrouping(
        { getState, dispatch, patchState }: StateContext<BookStateModel>,
        { isbns, group }: BookActions.UpdatedBookGrouping,
    ) {
        const state = getState();

        for (const isbn of isbns) {
            state.bookMap[isbn].noGroup = !group;
            state.bookMap[isbn].groupId = group
                ? state.bookMap[isbn].groupId
                : 'unknown';
        }

        patchState({ bookMap: state.bookMap });

        return this.bookApi
            .booksControllerSetBookOwnershipFlags({ isbns, noGroup: !group })
            .pipe(
                tap(() => {
                    dispatch(new BookActions.UpdateBookSuccess());
                }),
            );
    }

    @Action(BookActions.UpdateBookFavorite)
    updateBookFavorite(
        { getState, dispatch, patchState }: StateContext<BookStateModel>,
        { isbns, favorite }: BookActions.UpdateBookFavorite,
    ) {
        const state = getState();

        for (const isbn of isbns) {
            state.bookMap[isbn].favorite = favorite;
        }

        patchState({ bookMap: state.bookMap });

        return this.bookApi
            .booksControllerSetBookOwnershipFlags({ isbns, favorite })
            .pipe(
                tap(() => {
                    dispatch(new BookActions.UpdateBookSuccess());
                }),
            );
    }

    @Action(BookActions.UpdateBookSuccess)
    updateBookSuccess({ dispatch, getState }: StateContext<BookStateModel>) {
        dispatch(
            new BookActions.LoadBooksOfUser(getState().currentOwnerId || ''),
        );

        this.snack.show('Book(s) updated successfully!');
    }

    @Selector()
    static currentOwnerId(state: BookStateModel): string | undefined {
        return state.currentOwnerId;
    }

    @Selector()
    static currentCollection(state: BookStateModel): string[] | undefined {
        return state.currentCollection;
    }

    @Selector()
    static bookMap(state: BookStateModel) {
        return state.bookMap;
    }

    @Selector()
    static selectedFavorite(state: BookStateModel) {
        return state.selectedFavorite;
    }

    @Selector()
    static selectedBook(state: BookStateModel) {
        if (!state.selectedBook) {
            return undefined;
        }
        return state.bookMap[state.selectedBook];
    }

    @Selector()
    static loadingCollection(state: BookStateModel) {
        return state.loadingCollection;
    }

    @Selector()
    static loadingCollectionError(state: BookStateModel) {
        return state.loadingCollectionError;
    }

    static book(id: string) {
        return createSelector(
            [BooksState],
            (state: BookStateModel): BookDto | undefined => {
                return state.bookMap[id];
            },
        );
    }

    @Selector()
    static currentGroupMap(state: BookStateModel) {
        return state.currentGroupMap;
    }

    @Selector()
    static loadingGroups(state: BookStateModel) {
        return state.loadingGroups;
    }

    @Selector()
    static loadingGroupsError(state: BookStateModel) {
        return state.loadingGroupsError;
    }

    @Selector()
    static searchResult(state: BookStateModel) {
        return state.searchResult;
    }

    @Selector()
    static searchLoading(state: BookStateModel) {
        return state.searchLoading;
    }

    @Selector()
    static searchError(state: BookStateModel) {
        return state.searchError;
    }

    @Selector()
    static totalBookCount(state: BookStateModel) {
        return state.currentCollection?.length || 0;
    }

    @Selector()
    static ownsSelectedBook(state: BookStateModel): boolean {
        if (!state.selectedBook || !state.currentCollection) {
            return false;
        }

        return state.currentCollection.includes(state.selectedBook);
    }

    @Selector()
    static ownershipChangeLoading(state: BookStateModel) {
        return state.ownershipChangeLoading;
    }

    @Selector()
    static currentBookList(state: BookStateModel): BookDto[] | undefined {
        if (!state.currentCollection) {
            return undefined;
        }

        return state.currentCollection.map((isbn) => state.bookMap[isbn]);
    }

    @Selector()
    static searchedBook(state: BookStateModel) {
        if (!state.searchResult) {
            return undefined;
        }

        return state.bookMap[state.searchResult];
    }

    @Selector()
    static filter(state: BookStateModel) {
        return state.filter;
    }

    @Selector()
    static authorFilter(state: BookStateModel) {
        return state.authorFilter;
    }

    @Selector()
    static publisherFilter(state: BookStateModel) {
        return state.publisherFilter;
    }

    @Selector()
    static languageFilter(state: BookStateModel) {
        return state.languageFilter;
    }

    @Selector()
    static recentFilter(state: BookStateModel) {
        return state.recentFilter;
    }

    @Selector()
    static currentPublishers(state: BookStateModel) {
        const publishers = new Set<string>();

        if (!state.currentCollection) {
            return [];
        }

        for (const isbn of state.currentCollection) {
            const book = state.bookMap[isbn];
            if (book.publisherId) {
                publishers.add(book.publisherId);
            }
        }

        return Array.from(publishers.values());
    }

    @Selector()
    static currentLanguages(state: BookStateModel) {
        const languages = new Map<string, string>();

        if (!state.currentCollection) {
            return [];
        }

        const languageNames = new Intl.DisplayNames(['en'], {
            type: 'language',
        });

        for (const isbn of state.currentCollection) {
            const book = state.bookMap[isbn];

            const language = book.language || 'unknown';
            const languageName = languageNames.of(language) || 'Unknown';

            languages.set(languageName, language);
        }

        return languages;
    }

    @Selector()
    static currentAuthors(state: BookStateModel) {
        const authors = new Set<string>();

        if (!state.currentCollection) {
            return [];
        }

        for (const isbn of state.currentCollection) {
            const book = state.bookMap[isbn];
            for (const author of book.authors) {
                authors.add(author.id);
            }
        }

        return Array.from(authors.values());
    }

    static group(id: string) {
        return createSelector([BooksState], (state: BookStateModel) => {
            if (!state.currentGroupMap) {
                return undefined;
            }
            return state.currentGroupMap[id];
        });
    }
}
