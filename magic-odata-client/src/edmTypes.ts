

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