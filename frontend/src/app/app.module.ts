import {
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslocoService } from '@ngneat/transloco';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsModule } from '@ngxs/store';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { TimeagoModule } from 'ngx-timeago';
import { environment } from 'src/environments/environment';
import { ApiModule, Configuration } from './api';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BookDetailsSideComponent } from './common/components/book-details-side/book-details-side.component';
import { FooterComponent } from './common/footer/footer.component';
import { HeaderComponent } from './common/header/header.component';
import { ConfigService } from './common/services/config.service';
import { TokenService, getToken } from './common/services/token.service';
import { SidenavComponent } from './common/sidenav/sidenav.component';
import { AuthorState } from './state/authors/author.state';
import { BooksState } from './state/books/books.state';
import { PublisherState } from './state/publisher/publisher.state';
import { ReportState } from './state/reports/reports.state';
import { SystemState } from './state/system/system.state';
import { UiState } from './state/ui/ui.state';
import { UserState } from './state/user/user.state';
import { TranslocoRootModule } from './transloco-root.module';

@NgModule({
    declarations: [AppComponent],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        LazyLoadImageModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        ApiModule,
        HeaderComponent,
        TranslocoRootModule,
        NgxsModule.forRoot([
            UserState,
            UiState,
            BooksState,
            PublisherState,
            AuthorState,
            SystemState,
            ReportState,
        ]),
        NgxsReduxDevtoolsPluginModule.forRoot({
            disabled: environment.production,
        }),
        NgxsLoggerPluginModule.forRoot({ disabled: true }),
        MatSnackBarModule,
        MatSidenavModule,
        SidenavComponent,
        FooterComponent,
        BookDetailsSideComponent,
        TimeagoModule.forRoot(),
    ],
    providers: [
        {
            provide: Configuration,
            deps: [ConfigService],
            useFactory: (configService: ConfigService) => {
                configService.fetchConfig();
                return new Configuration({
                    basePath: configService.apiUrl(),
                    credentials: {
                        bearer: () => `Bearer ${getToken()}`,
                    },
                });
            },
            multi: false,
        },
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: { appearance: 'outline' },
        },
        {
            provide: APP_INITIALIZER,
            useFactory: initApp,
            deps: [TranslocoService, TokenService, ConfigService],
            multi: true,
        },
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModule {}

export function initApp(
    translocoService: TranslocoService,
    tokenService: TokenService,
    configService: ConfigService,
) {
    return () => {
        return new Promise((resolve) => {
            configService.fetchConfig();
            tokenService.refresh();
            translocoService.load('en').subscribe(() => {
                resolve(true);
            });
        });
    };
}
