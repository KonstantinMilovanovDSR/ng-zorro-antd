export type BooleanInput = boolean | string | undefined | null;
export type NzSafeAny = any;
export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export enum ValueChangeInvoker {
    FROM_INPUT,
    FROM_PANEL,
}
export type ValueChangeAction = {
    invoker: ValueChangeInvoker,
    value: Date
}