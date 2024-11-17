import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment } from '@angular/router';
import { AuthGuard } from './common/guards/auth.guard';
const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.component').then(
                (m) => m.LoginComponent,
            ),
    },
    {
        path: 'signup-success',
        loadComponent: () =>
            import('./pages/signup-success/signup-success.component').then(
                (m) => m.SignupSuccessComponent,
            ),
    },
    {
        path: 'verify',
        loadComponent: () =>
            import('./pages/verify-email/verify-email.component').then(
                (m) => m.VerifyEmailComponent,
            ),
    },
    {
        path: 'home',
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('./pages/home/home.component').then((m) => m.HomeComponent),
        data: { providesFooter: true },
    },
    {
        path: 'account',
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('./pages/account/account.component').then(
                (m) => m.AccountComponent,
            ),
    },
    {
        path: 'account/:tab',
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('./pages/account/account.component').then(
                (m) => m.AccountComponent,
            ),
    },
    {
        path: 'u/:name',
        redirectTo: (data) => {
            return '/@' + data.params['name'];
        },
        data: { providesFooter: true },
    },
    {
        path: 'book/:isbn',
        loadComponent: () =>
            import('./pages/standalone-book/standalone-book.component').then(
                (m) => m.StandaloneBookComponent,
            ),
    },
    {
        path: 'reset-password',
        loadComponent: () =>
            import('./pages/reset-password/reset-password.component').then(
                (m) => m.ResetPasswordComponent,
            ),
    },
    {
        path: 'debug/isbn',
        loadComponent: () =>
            import('./pages/isbn-debug/isbn-debug.component').then(
                (m) => m.IsbnDebugComponent,
            ),
    },
    {
        path: 'licenses',
        loadComponent: () =>
            import('./pages/licenses/licenses.component').then(
                (m) => m.LicensesComponent,
            ),
    },
    {
        matcher: (url) => {
            if (url.length !== 1 && !url[0].path.includes('@')) {
                return null;
            }

            return {
                consumed: url,
                posParams: {
                    name: new UrlSegment(url[0].path.replace('@', ''), {}),
                },
            };
        },
        loadComponent: () =>
            import('./pages/user-collection/user-collection.component').then(
                (m) => m.UserCollectionComponent,
            ),
        data: { providesFooter: true },
    },
    {
        path: '**',
        redirectTo: '/home',
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
