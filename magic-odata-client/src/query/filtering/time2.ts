import { ODataTypeRef } from "magic-odata-shared";
import { EdmDate, EdmDateTimeOffset, EdmDuration, EdmTimeOfDay } from "../../edmTypes.js";
import { Filter, FilterEnv, FilterResult, QbEmit } from "../../queryBuilder.js";
import { ReaderWriter } from "../../utils.js";
import { functionCall, infixOp } from "./op1.js";
import { filterize, Operable, operableToFilter } from "./operable0.js";
import { DecimalNumberTypes, IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const int32T = resolveOutputType(IntegerTypes.Int32)
const doubleT = resolveOutputType(DecimalNumberTypes.Double)
const durationT = resolveOutputType(NonNumericTypes.Duration)
const dateTimeOffsetT = resolveOutputType(NonNumericTypes.DateTimeOffset)
const dateT = resolveOutputType(NonNumericTypes.Date)
const timeT = resolveOutputType(NonNumericTypes.TimeOfDay)

export function addDateTimeOffset(lhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset, rhs: Operable<EdmDuration> | EdmDuration): Filter {

    return infixOp(
        filterize(lhs, dateTimeOffsetT, undefined),
        " add ",
        filterize(rhs, durationT, undefined),
        dateTimeOffsetT)
}

export function subDateTimeOffset(lhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset, rhs: Operable<EdmDuration> | EdmDuration): Filter {

    return infixOp(
        filterize(lhs, dateTimeOffsetT, undefined),
        " sub ",
        filterize(rhs, durationT, undefined),
        dateTimeOffsetT)
}

export function addDate(lhs: Operable<EdmDate> | EdmDate, rhs: Operable<EdmDuration> | EdmDuration): Filter {
    return infixOp(
        filterize(lhs, dateT, undefined),
        " add ",
        filterize(rhs, durationT, undefined),
        dateT)
}

export function subDate(lhs: Operable<EdmDate> | EdmDate, rhs: Operable<EdmDuration> | EdmDuration): Filter {
    return infixOp(
        filterize(lhs, dateT, undefined),
        " sub ",
        filterize(rhs, durationT, undefined),
        dateT)
}

export function addDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<EdmDuration> | EdmDuration): Filter {
    return infixOp(
        filterize(lhs, durationT, undefined),
        " add ",
        filterize(rhs, durationT, undefined),
        durationT)
}

export function subDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<EdmDuration> | EdmDuration): Filter {
    return infixOp(
        filterize(lhs, durationT, undefined),
        " sub ",
        filterize(rhs, durationT, undefined),
        durationT)
}

export function mulDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number> | number): Filter {
    return infixOp(
        filterize(lhs, durationT, undefined),
        " mul ",
        filterize(rhs, doubleT, undefined),
        durationT)
}

export function divDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number> | number): Filter {
    return infixOp(
        filterize(lhs, durationT, undefined),
        " div ",
        filterize(rhs, doubleT, undefined),
        durationT)
}

export function divByDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number> | number): Filter {
    return infixOp(
        filterize(lhs, durationT, undefined),
        " divby ",
        filterize(rhs, doubleT, undefined),
        durationT)
}

function accessorFunction<T>(
    name: string,
    operand: Operable<T>,
    outputType: ODataTypeRef): Filter {

    return functionCall(name, [operableToFilter(operand)], outputType)
}

const _now: Filter = ReaderWriter.retn<FilterEnv, FilterResult, QbEmit>({ $$output: dateTimeOffsetT, $$filter: "now()" }, QbEmit.zero)
export function now() {
    return _now;
}

const _maxdatetime: Filter = ReaderWriter.retn<FilterEnv, FilterResult, QbEmit>({ $$output: dateTimeOffsetT, $$filter: "maxdatetime()" }, QbEmit.zero)
export function maxDateTime() {
    return _maxdatetime
}

const _mindatetime: Filter = ReaderWriter.retn<FilterEnv, FilterResult, QbEmit>({ $$output: dateTimeOffsetT, $$filter: "mindatetime()" }, QbEmit.zero)
export function minDateTime() {
    return _mindatetime
}

export function date(date: Operable<EdmDateTimeOffset>) {
    return accessorFunction("date", date, dateT);
}

export function time(date: Operable<EdmDateTimeOffset>) {
    return accessorFunction("time", date, timeT);
}

export function totalOffsetMinutes(date: Operable<EdmDateTimeOffset>) {
    return accessorFunction("totaloffsetminutes", date, int32T);
}

export function totalSeconds(date: Operable<EdmDuration>) {
    return accessorFunction("totalseconds", date, int32T);
}

export function month(date: Operable<EdmDateTimeOffset | EdmDate>) {
    return accessorFunction("month", date, int32T);
}

export function day(date: Operable<EdmDateTimeOffset | EdmDate>) {
    return accessorFunction("day", date, int32T);
}

export function year(date: Operable<EdmDateTimeOffset | EdmDate>) {
    return accessorFunction("year", date, int32T);
}

export function fractionalSeconds(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>) {
    return accessorFunction("fractionalseconds", date, int32T);
}

export function minute(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>) {
    return accessorFunction("minute", date, int32T);
}

export function hour(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>) {
    return accessorFunction("hour", date, int32T);
}

export function second(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>) {
    return accessorFunction("second", date, int32T);
}