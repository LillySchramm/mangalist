import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoModule } from '@ngneat/transloco';
import { Store } from '@ngxs/store';
import { LicenseItemComponent } from 'src/app/common/components/license-item/license-item.component';
import { LicensesService } from 'src/app/common/services/licenses.service';
import { UiActions } from 'src/app/state/ui/ui.actions';
import { UserActions } from 'src/app/state/user/user.actions';

@Component({
    selector: 'app-licenses',
    standalone: true,
    imports: [MatTabsModule, TranslocoModule, LicenseItemComponent],
    templateUrl: './licenses.component.html',
    styleUrl: './licenses.component.scss',
})
export class LicensesComponent {
    $frontendLicenses = toSignal(this.licenses.getFrontendLicenses());
    $backendLicenses = toSignal(this.licenses.getBackendLicenses());

    constructor(
        private readonly licenses: LicensesService,
        private readonly store: Store,
    ) {
        this.store.dispatch(new UserActions.LoadUser());
        this.store.dispatch(new UiActions.ChangeSidenavVisibility(false));
        this.store.dispatch(new UiActions.ChangeInfoVisibility(false));
        this.store.dispatch(new UiActions.ChangeReportId(undefined));
    }
}
