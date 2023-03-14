import { QueryCollection, QueryObject, QueryPrimitive } from "./queryComplexObjectBuilder.js";
import { add, ceiling, div, divby, floor, mod, mul, negate, round, sub } from "./filtering/arithmetic2.js";
import {
    all, any, collectionFilter, collectionFunction, count, hasSubset, hasSubSequence, OperableCollection, concat as concatCollection, contains as containsCollection,
    startsWith as startsWithCollection, endsWith as endsWithCollection, indexOf as indexOfCollection, length as lengthCollection, subString as subStringCollection, $filter
} from "./filtering/collection1.js";
import {
    concat as concatString, contains as containsString, startsWith as startsWithString,
    endsWith as endsWithString, indexOf as indexOfString, length as lengthString, subString, matchesPattern, toLower, toUpper, trim
} from "./filtering/string1.js";
import { and, eq, ge, group, gt, isIn, le, logicalInfixOp, lt, ne, not, or } from "./filtering/logical2.js";
import { Operable } from "./filtering/operable0.js";
import { IntegerTypes, OutputTypes, RealNumberTypes } from "./filtering/queryPrimitiveTypes0.js";
import { Filter } from "../queryBuilder.js";
import { EdmDate, EdmDateTimeOffset, EdmDuration, EdmTimeOfDay } from "../edmTypes.js";
import { addDate, addDateTimeOffset, addDuration, date, day, divByDuration, divDuration, fractionalSeconds, hour, maxDateTime, minDateTime, minute, month, mulDuration, now, second, subDate, subDateTimeOffset, subDuration, time, totalOffsetMinutes, totalSeconds, year } from "./filtering/time2.js";
import { caseExpression } from "./filtering/case2.js";
import { FilterablePaths, FilterableProps, filterRaw } from "./filtering/op1.js";
import { $root } from "./root.js";
import { IUriBuilder } from "../entitySetInterfaces.js";

/**
 * This IEntitySet is made to generate a uri. It does not have the ability to query
 */
export type ThisEntitySetCannotQuery = never

export type FilterUtils<TRoot> = {
    /**
     * Do a custom filter operation. If mixing this operation with other
     * filtering operations, it is best to include an output type so that values
     * can be serialized correctly
     * @param filter  A basic filter string
     * @param outputType  Add this parameter if you are using 
     * the output of this filter with some of the other built in filters:
     * e.g. eq(x.val1, op(x.val2, p => `${p} add 1`, OutputTypes.Int32)). 
     * e.g. lt(x.minAge, op(`age add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * @example op("bandLeader eq 'Ringo'")
     */
    filterRaw(filter: string, outputType?: OutputTypes | undefined): Filter;

    /**
     * Do a custom filter operation using the path of an item.
     * @param obj  The root object of this filter operation. 
     * The root object can be any object available to the query. 
     * It does not have to be the query root object
     * @param filter  A function to build the filter as a string. 
     * The input is a reference to the root object param
     * The filter should return an unencoded filter string
     * @param outputType  Add this parameter if you are using 
     * the output of this filter with some of the other built in filters:
     * e.g. lt(x.minAge, op({ age: x.age }, p => `${p.age} add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * @example op({ property: x.bandLeader }, p => `${p.bandLeader} eq 'Ringo'`)
     */
    filterRaw(obj: FilterableProps, filter: (path: FilterablePaths) => string, outputType?: OutputTypes | undefined): Filter;

    /**
     * Do a custom filter operation with a given operator. The result of the operation should be a boolean
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example logicalOp(x.bandLeader, "eq", "Ringo")
     */
    logicalOp<T>(lhs: Operable<T>, operator: string, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "eq" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example eq(x.bandLeader, "Ringo")
     */
    eq<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "in" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example isIn(x.bandLeader, ["John", "Paul"])
     */
    isIn<T>(lhs: Operable<T>, rhs: T[] | OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData nested $filter operation. Like $filter=bandMembers/$filter(name eq "Ringo")/$count eq 1
     * @example $filter(x.bandMembers, member => eq(member.Name, "Ringo"))
     */
    $filter<T, TQuery extends QueryObject<T>>(collection: QueryCollection<TQuery, T> | Filter, itemFilter: (item: TQuery) => Filter): Filter;

    /**
     * An OData "en" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example ne(x.bandLeader, "Ringo")
     */
    ne<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "lt" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example lt(x.bandMemberCount, 4)
     */
    lt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "le" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example le(x.bandMemberCount, 4)
     */
    le<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "gt" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example gt(x.bandMemberCount, 4)
     */
    gt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "ge" operation
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example ge(x.bandMemberCount, 4)
     */
    ge<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "not(...)" operation
     * @param group - true If true, will surround the condition in (...).
     * @example not(eq(x.bandMemberCount, 4))
     */
    not(condition: Filter, group?: boolean): Filter;

    /**
     * Surrounds a filter value in (...)
     * @param condition  The value from a previous filter
     * @example and( group(eq(x.bandMemberCount, 4)), group(eq(x.bandLeader, "Ringo")) )
     */
    group(condition: Filter): Filter;

    /**
     * An OData "and" operation
     * @param conditions  The values from a previous filter
     * @example and(eq(x.bandMemberCount, 4)), group(eq(x.bandLeader, "Ringo"))
     */
    and(...conditions: Filter[]): Filter;

    /**
     * An OData "or" operation
     * @param conditions  The values from a previous filter
     * @example or(eq(x.bandMemberCount, 4)), group(eq(x.bandLeader, "Ringo"))
     */
    or(...conditions: Filter[]): Filter;

    /**
     * Do a filter operation on the elelments of a collection. The filter result should be a boolean
     * @example collectionFilter(x.bandMembers, "any", bandMember => eq(bandMember, "Ringo"))
     */
    collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        operator: string,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Call a function on a collection. The result of this function should be a boolean
     * @param mapper  A custom mapper to seialize individual values
     * @example collectionFunction("hassubset", x.bandMembers, ["Ringo", "John"])
     */
    collectionFunction<TArrayType>(
        functionName: string,
        collection: OperableCollection<TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * Do an OData "any" operation on a collection
     * @example any(x.bandMembers, bandMember => eq(bandMember, "Ringo"))
     */
    any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "all" operation on a collection
     * @example all(x.bandMembers, bandMember => eq(bandMember.band, "The Beatles"))
     */
    all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "$count" operation on a collection
     * @param countUnit - IntegerTypes.Int32 The expected result of the type
     * @example count(x.bandMembers)
     */
    count<T>(collection: OperableCollection<T>, countUnit?: IntegerTypes): Filter;

    /**
     * An OData "concat" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example concatCollection(x.bandMembers, ["Elvis"])
     */
    concatCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "concat" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example concatCollection(["Elvis"], x.bandMembers)
     */
    concatCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "contains" operation
     * @example containsCollection(x.bandMembers, "Ringo")
     */
    containsCollection<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;

    /**
     * An OData "contains" operation
     * @example containsCollection(["Ringo", "George"], x.bandMember)
     */
    containsCollection<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "indexof" operation
     * @example indexof(x.bandMembers, "Ringo")
     */
    indexOfCollection<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;

    /**
     * An OData "indexof" operation
     * @example indexof(["Ringo", "George"], x.bandMember)
     */
    indexOfCollection<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "length" operation
     * @example lengthCollection(x.bandMember)
     */
    lengthCollection<T>(collection: OperableCollection<T> | T[]): Filter;

    /**
     * An OData "startswith" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example startsWithCollection(x.bandMembers, ["Ringo", "John"])
     */
    startsWithCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "startswith" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example startsWithCollection(["Ringo", "John"], x.bandMembers)
     */
    startsWithCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "endswith" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example endsWithCollection(x.bandMembers, ["Ringo", "John"])
     */
    endsWithCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "endswith" operation
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example endsWithCollection(["Ringo", "John"], x.bandMembers)
     */
    endsWithCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "substring" operation on a collection
     * @example subStringCollection(x.bandMemberName, 5, 6)
     */
    subStringCollection<T>(lhs: OperableCollection<T>, start: number, length?: number): Filter;

    /**
     * Call the "hassubset" function on a collection
     * @param mapper  A custom mapper to seialize individual values
     * @example hasSubset(x.bandMembers, ["Ringo", "George"])
     */
    hasSubset<TArrayType>(
        collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * Call the "hassubsequence" function on a collection
     * @param mapper  A custom mapper to seialize individual values
     * @example hasSubSequence(x.bandMembers, ["Ringo", "George"])
     */
    hasSubSequence<TArrayType>(
        collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * An OData "+" operation
     * @example add(x.bandMembersCount, 4)
     */
    add(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "-" operation
     * @example sub(x.bandMembersCount, 4)
     */
    sub(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "-" operation
     * @example sub(4, x.bandMembersCount)
     */
    sub(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "*" operation
     * @example mul(x.bandMembersCount, 4)
     */
    mul(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on integers
     * @example div(x.bandMembersCount, 4)
     */
    div(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on integers
     * @example div(4, x.bandMembersCount)
     */
    div(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on decimals
     * @example divby(x.bandMembersCount, 4)
     */
    divby(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on decimals
     * @example divby(4, x.bandMembersCount)
     */
    divby(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "%" operation on decimals
     * @example mod(x.bandMembersCount, 4)
     */
    mod(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "%" operation on decimals
     * @example mod(4, x.bandMembersCount)
     */
    mod(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "ceiling" operation
     * @example ceiling(x.bandMembersCount)
     */
    ceiling(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "floor" operation
     * @example floor(x.bandMembersCount)
     */
    floor(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "round" operation
     * @example round(x.bandMembersCount)
     */
    round(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "-" operation. Add a "-" to the beginning of a property
     * @param group If true will surroud the property with ( ) before negating
     * @example negate(x.bandMembersCount)
     */
    negate(op: Operable<number | EdmDuration>, group?: boolean): Filter;

    /**
     * An OData "concat" operation
     * @example concatString(x.bandMember, " Starr")
     */
    concatString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "concat" operation
     * @example concatString("Drummer: ", x.bandMember)
     */
    concatString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "contains" operation
     * @example containsString(x.bandMember, "Rin")
     */
    containsString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "contains" operation
     * @example containsString("Drummer: Ringo", x.bandMember)
     */
    containsString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "matchesPattern" operation
     * @example matchesPattern(x.bandMember, "^Rin*")
     */
    matchesPattern(string: Operable<string>, pattern: Operable<string> | string): Filter;

    /**
     * An OData "matchesPattern" operation
     * @example matchesPattern("Drummer: Ringo", x.bandMemberRegex)
     */
    matchesPattern(string: Operable<string> | string, pattern: Operable<string>): Filter;

    /**
     * An OData "tolower" operation
     * @example toLower(x.bandMember)
     */
    toLower(string: Operable<string>): Filter;

    /**
     * An OData "toupper" operation
     * @example toUpper(x.bandMember)
     */
    toUpper(string: Operable<string>): Filter;

    /**
     * An OData "trim" operation
     * @example trim(x.bandMember)
     */
    trim(string: Operable<string>): Filter;

    /**
     * An OData "startswith" operation
     * @example startsWithString(x.bandMember, "Rin")
     */
    startsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "startswith" operation
     * @example startsWithString("Ringo Starr", x.bandMember)
     */
    startsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "endswith" operation
     * @example endsWithString(x.bandMember, "Starr")
     */
    endsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "endswith" operation
     * @example endsWithString("Drummer: Ringo", x.bandMember)
     */
    endsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "indexof" operation
     * @example indexOfString(x.bandMember, "Starr")
     */
    indexOfString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "indexof" operation
     * @example indexOfString("Ringo Startt", x.bandMember)
     */
    indexOfString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "length" operation
     * @example length(x.bandMember)
     */
    lengthString(lhs: Operable<string>): Filter;

    /**
     * An OData "substring" operation
     * @example subString(x.bandMember, 5, 6)
     */
    subString(lhs: Operable<string>, start: number, end?: number): Filter;

    /**
     * An OData "add" operation for Edm.DateTimeOffset
     * @example addDateTimeOffset(x.concertTime, new ODataDuration({m: 30}))
     */
    addDateTimeOffset(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "add" operation for Edm.DateTimeOffset
     * @example addDateTimeOffset(new Date(), x.concertLength)
     */
    addDateTimeOffset(lhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "sub" operation for Edm.DateTimeOffset
     * @example subDateTimeOffset(x.concertTime, new ODataDuration({m: 30}))
     */
    subDateTimeOffset(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "sub" operation for Edm.DateTimeOffset
     * @example subDateTimeOffset(new Date(), x.concertLength)
     */
    subDateTimeOffset(lhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "add" operation for Edm.Date
     * @example addDate(x.concertTime, new ODataDuration({d: 2}))
     */
    addDate(lhs: Operable<EdmDate>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "add" operation for Edm.Date
     * @example addDate(new Date(), x.concertMovedDays)
     */
    addDate(lhs: Operable<EdmDate> | EdmDate, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "sub" operation for Edm.Date
     * @example subDate(x.concertTime, new ODataDuration({d: 2}))
     */
    subDate(lhs: Operable<EdmDate>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "sub" operation for Edm.Date
     * @example subDate(new Date(2020, 1, 1), x.concertMovedDays)
     */
    subDate(lhs: Operable<EdmDate> | EdmDate, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "add" operation for Edm.Duration
     * @example addDuration(new ODataDuration({m: 20}), x.concertMovedDays)
     */
    addDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "add" operation for Edm.Duration
     * @example addDuration(x.concertMovedDays, new ODataDuration({m: 20}))
     */
    addDuration(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "sub" operation for Edm.Duration
     * @example subDuration(new ODataDuration({m: 20}), x.concertMovedDays)
     */
    subDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "sub" operation for Edm.Duration
     * @example subDuration(x.concertMovedDays, new ODataDuration({m: 20}))
     */
    subDuration(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "mul" operation for Edm.Duration
     * @example mulDuration(x.concertMovedDays, 10)
     */
    mulDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number>): Filter;

    /**
     * An OData "mul" operation for Edm.Duration
     * @example mulDuration(new ODataDuration({d: 1}), x.concertMovedDays)
     */
    mulDuration(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

    /**
     * An OData "div" operation for Edm.Duration
     * @example divDuration(x.concertMovedDays, 10)
     */
    divDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number>): Filter;

    /**
     * An OData "div" operation for Edm.Duration
     * @example divDuration(new ODataDuration({h: 10}), x.numberOfClients)
     */
    divDuration(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

    /**
     * An OData "divby" operation for Edm.Duration
     * @example divDuration(x.normalWaitTime, 10)
     */
    divByDuration(lhs: Operable<EdmDuration> | EdmDuration, rhs: Operable<number>): Filter;

    /**
     * An OData "divby" operation for Edm.Duration
     * @example divDuration(new ODataDuration({h: 10}), x.numberOfClients)
     */
    divByDuration(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

    /** An OData "now" operation */
    now(): Filter

    /** An OData "maxdatetime" operation */
    maxDateTime(): Filter

    /** An OData "mindatetime" operation */
    minDateTime(): Filter

    /** An OData "date" operation */
    date(date: Operable<EdmDateTimeOffset>): Filter

    /** An OData "time" operation */
    time(date: Operable<EdmDateTimeOffset>): Filter

    /** An OData "totaloffsetminutes" operation */
    totalOffsetMinutes(date: Operable<EdmDateTimeOffset>): Filter

    /** An OData "totalseconds" operation */
    totalSeconds(date: Operable<EdmDuration>): Filter

    /** An OData "month" operation */
    month(date: Operable<EdmDateTimeOffset | EdmDate>): Filter

    /** An OData "day" operation */
    day(date: Operable<EdmDateTimeOffset | EdmDate>): Filter

    /** An OData "year" operation */
    year(date: Operable<EdmDateTimeOffset | EdmDate>): Filter

    /** An OData "fractionalSeconds" operation */
    fractionalSeconds(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>): Filter

    /** An OData "minute" operation */
    minute(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>): Filter

    /** An OData "hour" operation */
    hour(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>): Filter

    /** An OData "second" operation */
    second(date: Operable<EdmDateTimeOffset | EdmTimeOfDay>): Filter

    /**
     * An OData "case" operation
     *
     * @example 
     * caseExpression(
     *  [eq(x.favouriteBeatle, "John"), filterRaw("'Incorrect'", NonNumericTypes.String)],
     *  [eq(x.favouriteBeatle, "Ringo"), filterRaw("'Correct'", NonNumericTypes.String)],
     *  [true, filterRaw("'Inconclusive'", NonNumericTypes.String)])
     */
    caseExpression(...cases: [Filter | true, Filter][]): Filter

    /**
     * Use the OData $root operation
     * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_root
     * 
     * Use the filter to do another separate OData query which can be incorporated into the current query
     *
     * @example eq(x.bandName, $root(root => root.bands.withKey(k => k.key("TheBeatles")).subPath(u => u.badName))
     */
    $root(filter: (root: TRoot) => IUriBuilder): Filter
}

export function newUtils<TRoot>(): FilterUtils<TRoot> {
    return {
        $root,
        filterRaw,
        logicalOp: logicalInfixOp,
        eq,
        isIn,
        $filter,
        ne,
        lt,
        le,
        gt,
        ge,
        not,
        group,
        and,
        or,
        collectionFilter,
        collectionFunction,
        concatCollection,
        containsCollection,
        startsWithCollection,
        endsWithCollection,
        indexOfCollection,
        lengthCollection,
        subStringCollection,
        any,
        all,
        count,
        hasSubset,
        hasSubSequence,
        add,
        sub,
        mul,
        div,
        divby,
        mod,
        concatString,
        containsString,
        matchesPattern,
        toLower,
        toUpper,
        trim,
        startsWithString,
        endsWithString,
        indexOfString,
        lengthString,
        subString,
        ceiling,
        floor,
        round,
        negate,
        addDuration,
        addDateTimeOffset,
        subDateTimeOffset,
        addDate,
        subDate,
        subDuration,
        mulDuration,
        divDuration,
        divByDuration,
        day,
        date,
        fractionalSeconds,
        hour,
        maxDateTime,
        minDateTime,
        minute,
        month,
        now,
        second,
        time,
        totalOffsetMinutes,
        totalSeconds,
        year,
        caseExpression
    }
}