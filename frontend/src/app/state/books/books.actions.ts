import {
    BookDto,
    BookGroupListDto,
    BookListDto,
    SetOwnershipStatusDto,
} from 'src/app/api';

export interface HttpError {
    status: number;
    statusText: string;
    url: string;
    ok: boolean;
    name: string;
    message: string;
}

export interface BookFlagUpdate {
    bookId: string;
    bool: boolean;
}

export namespace BookActions {
    export class LoadBooksOfUser {
        static readonly type = '[Books] Load Books of User';
        constructor(public id: string) {}
    }

    export class LoadBooksOfUserSuccess {
        static readonly type = '[Books] Load Books of User Success';
        constructor(public books: BookListDto) {}
    }

    export class LoadBooksOfUserFail {
        static readonly type = '[Books] Load Books of User Fail';
        constructor(public error: string) {}
    }

    export class LoadBookGroupsOfUser {
        static readonly type = '[Books] Load Book Groups of User';
        constructor(public id: string) {}
    }

    export class LoadBookGroupsOfUserSuccess {
        static readonly type = '[Books] Load Book Groups of User Success';
        constructor(public groups: BookGroupListDto) {}
    }

    export class LoadBookGroupsOfUserFail {
        static readonly type = '[Books] Load Book Groups of User Fail';
        constructor(public error: string) {}
    }

    export class SelectBook {
        static readonly type = '[Books] Select Book';
        constructor(
            public id: string | undefined,
            public favorite: boolean,
        ) {}
    }

    export class SearchBooks {
        static readonly type = '[Books] Search Book';
        constructor(
            public isbn: string,
            public skipCrawl: boolean,
        ) {}
    }

    export class SearchBooksSuccess {
        static readonly type = '[Books] Search Book Success';
        constructor(public book: BookDto) {}
    }

    export class SearchBooksFail {
        static readonly type = '[Books] Search Book Fail';
        constructor(public error: HttpError) {}
    }

    export class ChangeOwnership {
        static readonly type = '[Books] Change Ownership';
        constructor(
            public bookId: string,
            public payload: SetOwnershipStatusDto,
        ) {}
    }
    export class ChangeOwnershipSuccess {
        static readonly type = '[Books] Change Ownership Success';
        constructor(public added: boolean) {}
    }

    export class SetFilter {
        static readonly type = '[Books] Set Filter';
        constructor(public filter: string | undefined) {}
    }

    export class SetAuthorFilter {
        static readonly type = '[Books] Set Author Filter';
        constructor(public authorIds: string[]) {}
    }

    export class SetPublisherFilter {
        static readonly type = '[Books] Set Publisher Filter';
        constructor(public publisherIds: string[]) {}
    }

    export class SetLanguageFilter {
        static readonly type = '[Books] Set Language Filter';
        constructor(public languageIds: string[]) {}
    }

    export class SetRecentFilter {
        static readonly type = '[Books] Set Recent Filter';
        constructor(public recent: boolean) {}
    }

    export class UpdateBookVisibility {
        static readonly type = '[Books] Update Book Visibility';
        constructor(
            public isbns: string[],
            public visible: boolean,
        ) {}
    }

    export class UpdatedBookGrouping {
        static readonly type = '[Books] Updated Book Grouping';
        constructor(
            public isbns: string[],
            public group: boolean,
        ) {}
    }

    export class UpdateBookFavorite {
        static readonly type = '[Books] Updated Book Favorite';
        constructor(
            public isbns: string[],
            public favorite: boolean,
        ) {}
    }

    export class UpdateBookSuccess {
        static readonly type = '[Books] Update Book Success';
    }
}
