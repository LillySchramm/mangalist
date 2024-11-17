import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslocoModule } from '@ngneat/transloco';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Select, Store } from '@ngxs/store';
import { Observable, combineLatest, debounceTime, map } from 'rxjs';
import { UserDto } from 'src/app/api';
import { FormErrorPipe } from 'src/app/common/pipes/form-error.pipe';
import { AddBookDialogComponent } from 'src/app/pages/home/add-book-dialog/add-book-dialog.component';
import { AuthorState } from 'src/app/state/authors/author.state';
import { BookActions } from 'src/app/state/books/books.actions';
import { BooksState } from 'src/app/state/books/books.state';
import {
    PublisherMap,
    PublisherState,
} from 'src/app/state/publisher/publisher.state';
import { UserState } from 'src/app/state/user/user.state';
import { ChipFilterComponent } from '../../components/chip-filter/chip-filter.component';

@UntilDestroy()
@Component({
    selector: 'app-collection',
    standalone: true,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDividerModule,
        TranslocoModule,
        FormErrorPipe,
        MatIconModule,
        MatDialogModule,
        AddBookDialogComponent,
        ChipFilterComponent,
        MatSlideToggleModule,
    ],
    templateUrl: './collection.component.html',
    styleUrls: ['./collection.component.scss'],
})
export class CollectionComponent {
    @Select(UserState.currentUser) currentUser$!: Observable<
        UserDto | undefined
    >;
    $currentUser = toSignal(this.currentUser$);

    @Select(BooksState.currentOwnerId) currentOwnerId$!: Observable<
        string | undefined
    >;
    $currentOwnerId = toSignal(this.currentOwnerId$);

    @Select(BooksState.currentPublishers) publisherIds$!: Observable<string[]>;
    $publisherIds = toSignal(this.publisherIds$);

    @Select(BooksState.currentAuthors) authorIds$!: Observable<string[]>;
    $authorIds = toSignal(this.authorIds$);

    @Select(PublisherState.publishers) publishers$!: Observable<PublisherMap>;
    $publishers = toSignal(this.publishers$);

    @Select(BooksState.currentLanguages) languages$!: Observable<
        Map<string, string>
    >;
    $languages = toSignal(this.languages$);

    languageNames$ = combineLatest([this.languages$]).pipe(
        map(([languages]) => {
            return Array.from(languages.keys())
                .sort()
                .filter((name) => name !== 'unknown');
        }),
    );
    $languageNames = toSignal(this.languageNames$);

    publisherNames$ = combineLatest([
        this.publisherIds$,
        this.publishers$,
    ]).pipe(
        map(([ids, entities]) => {
            return ids
                .map((id) => entities[id]?.name)
                .sort()
                .filter((name) => name !== undefined);
        }),
        map((names) => {
            const deduped: string[] = [];
            const seen: string[] = [];

            names.forEach((name) => {
                if (!seen.includes(name.toLowerCase())) {
                    deduped.push(name);
                    seen.push(name.toLowerCase());
                }
            });

            return deduped;
        }),
    );
    $publisherNames = toSignal(this.publisherNames$);

    @Select(AuthorState.authors) authors$!: Observable<PublisherMap>;
    $authors = toSignal(this.authors$);

    authorNames$ = combineLatest([this.authorIds$, this.authors$]).pipe(
        map(([ids, entities]) => {
            return ids.map((id) => entities[id]?.name).sort();
        }),
    );
    $authorNames = toSignal(this.authorNames$);

    public form = new FormGroup({
        searchText: new FormControl(''),
    });

    constructor(
        private dialog: MatDialog,
        private store: Store,
    ) {
        this.store.dispatch(new BookActions.SetFilter(undefined));
        this.form.valueChanges
            .pipe(untilDestroyed(this), debounceTime(100))
            .subscribe((value) => {
                if (value.searchText === null) {
                    return;
                }
                this.store.dispatch(
                    new BookActions.SetFilter(value.searchText),
                );
            });
    }

    setAuthorFilter(authorNames: string[]) {
        const authors = this.$authors();
        if (!authors) {
            return;
        }

        const authorIds = Object.keys(authors).filter((key) =>
            authorNames.includes(authors[key].name),
        );

        this.store.dispatch(new BookActions.SetAuthorFilter(authorIds));
    }

    setLanguageFilter(languageNames: string[]) {
        const languages = this.$languages();
        if (!languages) {
            return;
        }

        const languageIds = languageNames
            .map((name) => this.$languages()?.get(name))
            .filter((id) => id !== undefined) as string[];

        this.store.dispatch(new BookActions.SetLanguageFilter(languageIds));
    }

    setPublisherFilter(publisherNames: string[]) {
        const publishers = this.$publishers();
        if (!publishers) {
            return;
        }

        const publisherIds = Object.keys(publishers).filter((key) =>
            publisherNames
                .map((name) => name.toLowerCase())
                .includes(publishers[key].name.toLowerCase()),
        );

        this.store.dispatch(new BookActions.SetPublisherFilter(publisherIds));
    }

    setRecentFilter(recent: boolean) {
        this.store.dispatch(new BookActions.SetRecentFilter(recent));
    }

    openAddBookDialog() {
        this.dialog.open(AddBookDialogComponent);
    }
}
