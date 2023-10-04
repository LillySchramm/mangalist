export namespace UiActions {
    export class ChangeSidenavVisibility {
        static readonly type = '[UI] Change Sidenav Visibility';
        constructor(public payload: boolean) {}
    }

    export class ChangeInfoVisibility {
        static readonly type = '[UI] Change Info Visibility';
        constructor(public payload: boolean) {}
    }

    export class ChangePageTitle {
        static readonly type = '[UI] Change Page Title';
        constructor(public payload: string | undefined) {}
    }

    export class ChangeInfoTitle {
        static readonly type = '[UI] Change Info Title';
        constructor(public payload: string | undefined) {}
    }

    export class ChangePageSubtitle {
        static readonly type = '[UI] Change Page Subtitle';
        constructor(public payload: string | undefined) {}
    }

    export class ChangeSidenavMode {
        static readonly type = '[UI] Change Sidenav Mode';
        constructor(public payload: string) {}
    }
}
