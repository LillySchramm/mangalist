import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@ngneat/transloco';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Select, Store } from '@ngxs/store';
import { BehaviorSubject, Observable, map, withLatestFrom } from 'rxjs';
import { BookDto } from 'src/app/api';
import { FooterComponent } from 'src/app/common/footer/footer.component';
import { UiService } from 'src/app/common/services/ui.service';
import { BookGroupMap, BooksState } from 'src/app/state/books/books.state';
import { UiActions } from 'src/app/state/ui/ui.actions';
import { BookGroupComponent } from '../book-group/book-group.component';

export interface BookGrouping {
    [key: string]: BookDto[];
}

@UntilDestroy()
@Component({
    selector: 'app-collection-display',
    standalone: true,
    imports: [
        BookGroupComponent,
        TranslocoModule,
        MatProgressSpinnerModule,
        ScrollingModule,
        NgClass,
        FooterComponent,
    ],
    templateUrl: './collection-display.component.html',
    styleUrls: ['./collection-display.component.scss'],
})
export class CollectionDisplayComponent {
    @Select(BooksState.currentBookList) currentCollection$!: Observable<
        BookDto[] | undefined
    >;
    $currentCollection = toSignal(this.currentCollection$);

    @Select(BooksState.filter) filter$!: Observable<string | undefined>;
    @Select(BooksState.authorFilter) authorFilter$!: Observable<
        string[] | undefined
    >;
    @Select(BooksState.publisherFilter) publisherFilter$!: Observable<
        string[] | undefined
    >;
    @Select(BooksState.languageFilter) languageFilter$!: Observable<
        string[] | undefined
    >;

    @Select(BooksState.currentGroupMap) currentGroupMap$!: Observable<
        BookGroupMap | undefined
    >;
    $currentGroupMap = toSignal(this.currentGroupMap$);

    @Select(BooksState.recentFilter) recentFilter$!: Observable<boolean>;
    $recentFilter = toSignal(this.recentFilter$);

    @Select(BooksState.currentOwnerId) currentOwnerId$!: Observable<
        string | undefined
    >;

    @Select(BooksState.loadingCollection)
    loadingCollection$!: Observable<boolean>;
    $loadingCollection = toSignal(this.loadingCollection$);

    sorting$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    $sorting = toSignal(this.sorting$);

    groupedBooks$ = this.currentCollection$.pipe(
        untilDestroyed(this),
        map((collection) => {
            this.sorting$.next(true);

            if (!collection) return {} as BookGrouping;

            const map = {} as BookGrouping;

            for (const book of collection) {
                const groupId = book.groupId || 'unknown';
                if (!map[groupId]) {
                    map[groupId] = [];
                }

                map[groupId].push(book);

                if (book.favorite) {
                    if (!map['favorite']) {
                        map['favorite'] = [];
                    }
                    map['favorite'].push(book);
                }
            }

            return map;
        }),
        map((map) => {
            return Object.entries(map).map(([key, value]) => {
                return {
                    key,
                    value,
                };
            });
        }),
        map((entries) => entries.filter((entry) => entry.value.length > 0)),
        withLatestFrom(this.currentGroupMap$),
        map(([entries, groupMap]) => {
            this.sorting$.next(true);
            if (!groupMap)
                return [] as {
                    key: string;
                    value: BookDto[];
                }[];

            return entries.sort((a, b) => {
                if (a.key === 'favorite') return -1;
                if (b.key === 'favorite') return 1;

                if (a.key === 'unknown') return 1;
                if (b.key === 'unknown') return -1;

                const aGroup = groupMap[a.key];
                const bGroup = groupMap[b.key];
                if (!aGroup) return 1;
                if (!bGroup) return -1;

                return aGroup.name.localeCompare(bGroup.name);
            });
        }),
        map((entries) => {
            return entries.map((entry) => {
                return {
                    key: entry.key,
                    value: entry.value.sort((a, b) => {
                        if (a.title && b.title) {
                            const aNumber = this.getBookNumberFromTitle(
                                a.title,
                            );
                            const bNumber = this.getBookNumberFromTitle(
                                b.title,
                            );

                            if (aNumber && bNumber) {
                                return aNumber > bNumber ? 1 : -1;
                            }
                        }

                        return a.isbn.localeCompare(b.isbn);
                    }),
                };
            });
        }),
        withLatestFrom(
            this.filter$,
            this.authorFilter$,
            this.publisherFilter$,
            this.languageFilter$,
            this.recentFilter$,
        ),
        map(
            ([
                entries,
                filter,
                authorFilter,
                publisherFilter,
                languageFilter,
                recentFilter,
            ]) => {
                this.sorting$.next(true);
                const cache = this.getFilterFromCache(
                    entries.length,
                    filter,
                    authorFilter,
                    publisherFilter,
                    languageFilter,
                    recentFilter,
                );

                if (
                    (!filter &&
                        !authorFilter &&
                        !publisherFilter &&
                        !recentFilter &&
                        !languageFilter) ||
                    cache
                ) {
                    this.sorting$.next(false);
                    return cache ?? entries;
                }

                const sorted = entries
                    .map((entry) => {
                        return {
                            key: entry.key,
                            value: entry.value.filter((book) =>
                                this.filterBook(
                                    book,
                                    entry.key,
                                    filter,
                                    authorFilter,
                                    publisherFilter,
                                    languageFilter,
                                    recentFilter,
                                ),
                            ),
                        };
                    })
                    .filter((entry) => entry.value.length > 0);

                this.setFilterToCache(
                    filter,
                    authorFilter,
                    publisherFilter,
                    languageFilter,
                    sorted,
                    recentFilter,
                );
                this.sorting$.next(false);

                return sorted;
            },
        ),
    );
    $groupedBooks = toSignal(this.groupedBooks$);

    filterCache: Map<
        string,
        {
            key: string;
            value: BookDto[];
        }[]
    > = new Map();
    lastFilterSize = 0;

    constructor(
        private store: Store,
        private ui: UiService,
    ) {
        this.currentOwnerId$.pipe(untilDestroyed(this)).subscribe((ownerId) => {
            this.store.dispatch(new UiActions.ChangeReportId(ownerId));
        });
    }

    trackById(index: number, element: any): number {
        return element.key;
    }

    filterBook(
        book: BookDto,
        groupName: string,
        filter: string | undefined,
        authorFilter: string[] | undefined,
        publisherFilter?: string[] | undefined,
        languageFilter?: string[] | undefined,
        recentFilter?: boolean,
    ): boolean {
        filter = filter ? filter.toLowerCase() : '';

        if (recentFilter && !this.ui.isNewBook(book)) return false;

        const containsLanguage = languageFilter?.length
            ? languageFilter.includes(book.language || '')
            : true;
        if (!containsLanguage) return false;

        const containsAuthor = authorFilter?.length
            ? !!book.authors.find((author) => authorFilter.includes(author.id))
            : true;
        if (!containsAuthor) return false;

        const containsPublisher = publisherFilter?.length
            ? publisherFilter.includes(book.publisherId || '')
            : true;
        if (!containsPublisher) return false;

        if (book.title === null) return false;

        return (
            book.title.toLowerCase().includes(filter) ||
            book.isbn.includes(filter) ||
            groupName.toLowerCase().includes(filter)
        );
    }

    getBookNumberFromTitle(title: string): number | null {
        const regex = /\d+/g;
        const found = title.match(regex);
        if (found) {
            return Number.parseInt(found[found.length - 1]);
        }
        return null;
    }

    private getFilterFromCache(
        count: number,
        filter: string | undefined,
        authorFilter: string[] | undefined,
        publisherFilter?: string[] | undefined,
        languageFilter?: string[] | undefined,
        recentFilter?: boolean,
    ):
        | {
              key: string;
              value: BookDto[];
          }[]
        | null {
        if (!this.filterCache) this.filterCache = new Map();

        if (this.lastFilterSize !== count) {
            this.filterCache.clear();
            this.lastFilterSize = count;
        }

        const key = `${filter}-${recentFilter}-${authorFilter?.join('-')}-${publisherFilter?.join('-')}-${languageFilter?.join('-')}`;
        return this.filterCache.get(key) || null;
    }

    private setFilterToCache(
        filter: string | undefined,
        authorFilter: string[] | undefined,
        publisherFilter: string[] | undefined,
        languageFilter: string[] | undefined,
        value: {
            key: string;
            value: BookDto[];
        }[],
        recentFilter?: boolean,
    ): void {
        const key = `${filter}-${recentFilter}-${authorFilter?.join('-')}-${publisherFilter?.join('-')}-${languageFilter?.join('-')}`;
        this.filterCache.set(key, value);
    }
}
