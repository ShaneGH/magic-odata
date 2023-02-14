
export type DateStruct = {
    /**
     * Year
     */
    y: number

    /**
     * Month
     */
    M: number

    /**
     * Day
     */
    d: number
}

export type TimeStruct = {
    /**
     * Hour
     */
    h: number

    /**
     * Minute
     */
    m: number

    /**
     * Second. The Second must be an int. Use the ms property to define milliseconds
     * @default 0
     */
    s?: number

    /**
     * Millisecond
     * @default 0
     */
    ms?: number
}

export type DurationStruct = Partial<{
    /**
     * Days
     */
    d: number
} & TimeStruct>

export type OffsetStruct = {
    /**
     * Hour
     * @default 0
     */
    offsetH?: number

    /**
     * Minute
     * @default 0
     */
    offsetM?: number
}