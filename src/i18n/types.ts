/** The shape of a translation file: same keys as English, any string values. */
export type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
