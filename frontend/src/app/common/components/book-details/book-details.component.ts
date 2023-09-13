import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Select, Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { BookDto } from 'src/app/api';
import { AuthorMap, AuthorState } from 'src/app/state/authors/author.state';
import { BooksState } from 'src/app/state/books/books.state';
import {
    PublisherMap,
    PublisherState,
} from 'src/app/state/publisher/publisher.state';
import { UiActions } from 'src/app/state/ui/ui.actions';
import { CoverService } from '../../services/cover.service';
import { NoImagePlaceholderComponent } from '../no-image-placeholder/no-image-placeholder.component';

@UntilDestroy()
@Component({
    selector: 'app-book-details',
    standalone: true,
    imports: [
        CommonModule,
        NoImagePlaceholderComponent,
        TranslocoModule,
        MatDividerModule,
    ],
    templateUrl: './book-details.component.html',
    styleUrls: ['./book-details.component.scss'],
})
export class BookDetailsComponent {
    @Select(BooksState.selectedBook) book$!: Observable<BookDto | undefined>;
    $book = toSignal(this.book$);

    @Select(PublisherState.publishers) publishers$!: Observable<PublisherMap>;
    @Select(AuthorState.authors) authors$!: Observable<AuthorMap>;

    publisherName$ = combineLatest([this.book$, this.publishers$]).pipe(
        untilDestroyed(this),
        map(([book, publishers]) => {
            if (!book || !book.publisherId) {
                return this.transloco.translate('book-details.noPublisher');
            }

            const publisher = publishers[book.publisherId];
            if (!publisher) {
                return this.transloco.translate(
                    'book-details.publisherLoading',
                );
            }

            return publisher.name;
        }),
    );
    $publisherName = toSignal(this.publisherName$);

    authorNames$ = combineLatest([this.book$, this.authors$]).pipe(
        untilDestroyed(this),
        map(([book, authors]) => {
            if (!book || !book.authors) {
                return [this.transloco.translate('book-details.noAuthors')];
            }

            if (!book.authors.length) {
                return [
                    this.transloco.translate('book-details.authorsLoading'),
                ];
            }

            return book.authors
                .map((identifier) => authors[identifier.id])
                .filter((author) => !!author)
                .map((author) => author.name);
        }),
    );
    $authorNames = toSignal(this.authorNames$);

    coverUrl?: string | null = '';

    constructor(
        private readonly store: Store,
        private readonly cover: CoverService,
        private readonly transloco: TranslocoService,
    ) {
        this.book$.pipe(untilDestroyed(this)).subscribe((book) => {
            if (!book) {
                return;
            }

            if (book.bookCoverId) {
                this.coverUrl = this.cover.getCoverUrl(book.bookCoverId);
            }

            this.store.dispatch(
                new UiActions.ChangeInfoTitle(book.title || ''),
            );
        });
    }
}
