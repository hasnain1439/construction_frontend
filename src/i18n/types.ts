/** Same shape as an English dictionary, with every text widened to `string` (for roman-ur / ur). */
export type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
