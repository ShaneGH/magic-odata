

/** Check that all numeric properties have the same sign */
function checkSigns<T extends { [k: string]: any }>(data: T, keys?: (keyof T)[]) {

    let dataKeys = Object.keys(data)
    if (keys) {
        dataKeys = dataKeys.filter(x => keys.indexOf(x) !== -1);
    }

    const results = dataKeys
        .map(k => data[k]!)
        .filter(x => x && !isNaN(x));    // filter out 0 and null

    const nonNegative = results.filter(x => x > 0).length
    return nonNegative === 0 || nonNegative === results.length
}

type ODataDateInputs = {
    /** Year */
    y: number

    /** Month */
    M: number

    /** Day */
    d: number
}

/** Represents an Edm.Date type */
export class ODataDate {
    /** Year */
    readonly y: number

    /** Month */
    readonly M: number

    /** Day */
    readonly d: number

    constructor(inupts: ODataDateInputs) {
        this.y = inupts.y
        this.M = inupts.M
        this.d = inupts.d
    }
}

export type ODataTimeInputs = {
    /** Hour */
    h: number

    /** Minute */
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

export class ODataTimeOfDay {
    /** Hour */
    readonly h: number

    /** Minute */
    readonly m: number

    /** Second. The Second must be an int. Use the ms property to define milliseconds */
    readonly s: number

    /** Millisecond */
    readonly ms: number

    constructor(inupts: ODataTimeInputs) {
        this.h = inupts.h
        this.m = inupts.m
        this.s = inupts.s || 0
        this.ms = inupts.ms || 0

        if (this.h >= 24) {
            throw new Error("Max hours: 23");
        }

        if (this.m >= 60) {
            throw new Error("Max minutes: 59");
        }

        if (this.s >= 60) {
            throw new Error("Max seconds: 59");
        }

        if (this.ms >= 1000) {
            throw new Error("Max miliseconds: 999");
        }
    }
}

export type ODataDurationInputs = Partial<{
    /** Days */
    d: number
} & ODataTimeInputs>

export class ODataDuration {
    /** Days */
    readonly d: number

    /** Hour */
    readonly h: number

    /** Minute */
    readonly m: number

    /** Second. The Second must be an int. Use the ms property to define milliseconds */
    readonly s: number

    /** Millisecond */
    readonly ms: number

    constructor(inupts: ODataDurationInputs) {
        this.d = inupts.d || 0
        this.h = inupts.h || 0
        this.m = inupts.m || 0
        this.s = inupts.s || 0
        this.ms = inupts.ms || 0

        checkSigns(this)

        if (this.ms >= 1000 || this.ms <= -1000) {
            throw new Error("Max miliseconds: 999");
        }
    }

    static fromSeconds(s: number) {
        return ODataDuration.fromMilliseconds(s * 1000)
    }

    static fromMinutes(m: number) {
        return ODataDuration.fromSeconds(m * 60)
    }

    static fromHours(h: number) {
        return ODataDuration.fromMinutes(h * 60)
    }

    static fromDays(d: number) {
        return ODataDuration.fromHours(d * 24)
    }

    static fromMilliseconds(ms: number) {
        const sign = ms < 0 ? -1 : 1;
        ms = Math.round(Math.abs(ms))

        const days = factor(ms, 8.64e+7)
        const hours = factor(days.remainder, 3.6e+6)
        const minutes = factor(hours.remainder, 60000)
        const seconds = factor(minutes.remainder, 1000)

        return new ODataDuration({
            d: days.result * sign,
            h: hours.result * sign,
            m: minutes.result * sign,
            s: seconds.result * sign,
            ms: seconds.remainder * sign
        })
    }
}

export type ODataOffsetInputs = {
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

export class ODataOffset {

    /** Hour */
    readonly offsetH: number

    /** Minute */
    readonly offsetM: number

    constructor(inupts: ODataOffsetInputs) {
        this.offsetH = inupts.offsetH || 0
        this.offsetM = inupts.offsetM || 0

        checkSigns(this)
    }
}

function factor(value: number, factor: number) {

    if (value < factor) {
        return { result: 0, remainder: value }
    }

    const result = Math.floor(value / factor)
    const remainder = value % factor
    return { result, remainder }
}

export class ODataDateTimeOffset {
    /** Year */
    readonly y: number

    /** Month */
    readonly M: number

    /** Day */
    readonly d: number

    /** Hour */
    readonly h: number

    /** Minute */
    readonly m: number

    /** Second. The Second must be an int. Use the ms property to define milliseconds */
    readonly s: number

    /** Millisecond */
    readonly ms: number

    /** Hour */
    readonly offsetH: number

    /** Minute */
    readonly offsetM: number

    constructor(inupts: ODataDateInputs & Partial<ODataTimeInputs> & Partial<ODataOffsetInputs>) {
        this.y = inupts.y
        this.M = inupts.M
        this.d = inupts.d
        this.h = inupts.h || 0
        this.m = inupts.m || 0
        this.s = inupts.s || 0
        this.ms = inupts.ms || 0
        this.offsetH = inupts.offsetH || 0
        this.offsetM = inupts.offsetM || 0

        checkSigns(this, ["offsetH", "offsetM"])

        if (this.ms >= 1000 || this.ms <= -1000) {
            throw new Error("Max miliseconds: 999");
        }
    }
}

export type EdmDate = ODataDate | Date | string
export type EdmTimeOfDay = ODataTimeOfDay | Date | string

/** If the duration is a number, it is measured in milliseconds */
export type EdmDuration = ODataDuration | number | string

export type EdmDateTimeOffset = ODataDateTimeOffset | Date | string