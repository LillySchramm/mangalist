import { Injectable } from '@angular/core';
import { debounceTime, fromEvent } from 'rxjs';
import { BookDto } from 'src/app/api';

@Injectable({
    providedIn: 'root',
})
export class UiService {
    smallScreen = false;
    resize$ = fromEvent(window, 'resize').pipe(debounceTime(250));

    constructor() {
        this.smallScreen = window.innerWidth < 800;
        this.resize$.subscribe(() => {
            this.smallScreen = window.innerWidth < 800;
        });
    }

    // Books added as recently as 45 days ago are considered new
    isNewBook(book: BookDto): boolean {
        const date = new Date(book.ownedSince);
        const now = new Date();
        return now.getTime() - date.getTime() < 1000 * 60 * 60 * 24 * 45;
    }
}
