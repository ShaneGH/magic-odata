import { QueryCollection, QueryObject, QueryPrimitive } from "./queryComplexObjectBuilder.js";
import { add, ceiling, div, divby, floor, mod, mul, round, sub } from "./filtering/arithmetic2.js";
import {
    all, any, collectionFilter, collectionFunction, count, hassubset, hassubsequence, OperableCollection, concat as concatCollection, contains as containsCollection,
    startsWith as startsWithCollection, endsWith as endsWithCollection, indexOf as indexOfCollection, length as lengthCollection, subString as subStringCollection
} from "./filtering/collection1.js";
import {
    concat as concatString, contains as containsString, startsWith as startsWithString,
    endsWith as endsWithString, indexOf as indexOfString, length as lengthString, subString, matchesPattern, toLower, toUpper, trim
} from "./filtering/string1.js";
import { and, eq, ge, group, gt, isIn, le, logicalInfixOp, lt, ne, not, or } from "./filtering/logical2.js";
import { FilterablePaths, FilterableProps, filterRaw } from "./filtering/op1.js";
import { Operable } from "./filtering/operable0.js";
import { IntegerTypes, OutputTypes, RealNumberTypes } from "./filtering/queryPrimitiveTypes0.js";
import { Filter } from "../queryBuilder.js";
import { EdmDate, EdmDateTimeOffset, EdmDuration, EdmTimeOfDay } from "../edmTypes.js";
import { addTime, date, day, divByTime, divTime, fractionalSeconds, hour, maxDateTime, minDateTime, minute, month, mulTime, now, second, subTime, time, totalOffsetMinutes, totalSeconds, year } from "./filtering/time2.js";
import { caseExpression } from "./filtering/case2.js";

export type FilterUtils = {
    /**
     * Do a custom filter operation. If mixing this operation with other
     * filtering operations, it is best to include an output type so that values
     * can be serialized correctly
     * @param filter  A basic filter string
     * @param outputType  Add this parameter if you are using 
     * the output of this filter with some of the other built in filters:
     * e.g. eq(my.val1, op(my.val2, p => `${p} add 1`, OutputTypes.Int32)). 
     * e.g. lt(my.minAge, op(`age add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * @example op("property eq 'hello'")
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
     * e.g. lt(my.minAge, op({ age: my.age }, p => `${p.age} add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * @example op({ property: my.property }, p => `${p.property} eq 'hello'`)
     */
    filterRaw(obj: FilterableProps, filter: (path: FilterablePaths) => string, outputType?: OutputTypes | undefined): Filter;

    /**
     * Do a custom filter operation with a given operator. The result of the operation should be a boolean
     * @param lhs  The left operand
     * @param operator  The operation
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example logicalOp(my.property, "eq", "hello")
     */
    logicalOp<T>(lhs: Operable<T>, operator: string, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "==" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example eq(my.property, "hello")
     */
    eq<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "in" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example isIn(my.property, [1, 3])
     */
    isIn<T>(lhs: Operable<T>, rhs: T[] | OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "!=" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example ne(my.property, "hello")
     */
    ne<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "<" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example lt(my.property, 4)
     */
    lt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "<=" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example le(my.property, 4)
     */
    le<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData ">" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example gt(my.property, 4)
     */
    gt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData ">=" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * @example ge(my.property, 4)
     */
    ge<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "not(...)" operation
     * @param condition  The value from a previous filter
     * @param group - true If true, will surround the condition in (...).
     * @example not(eq(my.property, 4))
     */
    not(condition: Filter, group?: boolean): Filter;

    /**
     * Surrounds a filter value in (...)
     * @param condition  The value from a previous filter
     * @example and( group(eq(my.property1, 4)), group(eq(my.property2, 4)) )
     */
    group(condition: Filter): Filter;

    /**
     * An OData "and" operation
     * @param conditions  The values from a previous filter
     * @example and( eq(my.property1, 4), eq(my.property2, 4) )
     */
    and(...conditions: Filter[]): Filter;

    /**
     * An OData "or" operation
     * @param conditions  The values from a previous filter
     * @example or( eq(my.property1, 4), eq(my.property2, 4) )
     */
    or(...conditions: Filter[]): Filter;

    /**
     * Do a filter operation on the elelments of a collection. The filter result should be a boolean
     * @param collection  The collection
     * @param operator  The operator used to expand the collection (e.g. any, all)
     * @param collectionItemOperation  The operation on individual collection items
     * @example collectionFilter(my.items, "any", item => eq(item, 4))
     */
    collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        operator: string,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Call a function on a collection. The result of this function should be a boolean
     * @param functionName  The function to call (e.g. hassubset)
     * @param collection  The collection
     * @param values  The second arg to pass into the function
     * @param mapper  A custom mapper to seialize individual values
     * @example collectionFunction("hassubset", my.items, [1, 2, 3])
     */
    collectionFunction<TArrayType>(
        functionName: string,
        collection: OperableCollection<TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * Do an OData "any" operation on a collection
     * @param collection  The collection
     * @param collectionItemOperation  The operation on individual collection items
     * @example any(my.items, item => eq(item, 4))
     */
    any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "all" operation on a collection
     * @param collection  The collection
     * @param collectionItemOperation  The operation on individual collection items
     * @example all(my.items, item => eq(item, 4))
     */
    all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "$count" operation on a collection
     * @param collection  The collection
     * @param countUnit - IntegerTypes.Int32 The expected result of the type
     * @example count(my.items)
     */
    count(collection: QueryCollection<any, any>, countUnit?: IntegerTypes): QueryPrimitive<Number>;

    /**
     * An OData "concat" operation
     * @param lhs  The first value to concatenate
     * @param rhs  The second value to concatenate
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example concatCollection(my.property, [1, 2, 3])
     */
    concatCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "concat" operation
     * @param lhs  The first value to concatenate
     * @param rhs  The second value to concatenate
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example concatCollection([1, 2, 3], my.property)
     */
    concatCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example containsCollection(my.values, 1)
     */
    containsCollection<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example containsCollection([1, 2, 3], my.value)
     */
    containsCollection<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "indexof" operation
     * @param lhs  The value to test for the index of rhs
     * @param rhs  The value to get the index of
     * @example indexof(my.values, 1)
     */
    indexOfCollection<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;

    /**
     * An OData "indexof" operation
     * @param lhs  The value to test for the index of rhs
     * @param rhs  The value to get the index of
     * @example indexof([1, 2, 3], my.value)
     */
    indexOfCollection<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "length" operation
     * @example lengthCollection(my.values)
     */
    lengthCollection<T>(collection: OperableCollection<T> | T[]): Filter;

    /**
     * An OData "startswith" operation
     * @param lhs  The collection to test the start of
     * @param rhs  The values to test for the existence of
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example startsWithCollection(my.property, [1, 2, 3])
     */
    startsWithCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "startswith" operation
     * @param lhs  The collection to test the start of
     * @param rhs  The values to test for the existence of
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example startsWithCollection([1, 2, 3], my.property)
     */
    startsWithCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "endswith" operation
     * @param lhs  The collection to test the end of
     * @param rhs  The values to test for the existence of
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example endsWithCollection(my.property, [1, 2, 3])
     */
    endsWithCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    /**
     * An OData "endswith" operation
     * @param lhs  The collection to test the end of
     * @param rhs  The values to test for the existence of
     * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
     * @example endsWithCollection([1, 2, 3], my.property)
     */
    endsWithCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "substring" operation on a collection
     * @param lhs The collection property to divide
     * @param start The position to start the division
     * @param length The length of the substring
     * @example subStringCollection(my.firstName, 5, 6)
     */
    subStringCollection<T>(lhs: OperableCollection<T>, start: number, length?: number): Filter;

    /**
     * Call the "hassubset" function on a collection
     * @param collection  The collection
     * @param values  The second arg to pass into the function
     * @param mapper  A custom mapper to seialize individual values
     * @example hassubset(my.items, [1, 2, 3])
     */
    hassubset<TArrayType>(
        collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * Call the "hassubsequence" function on a collection
     * @param collection  The collection
     * @param values  The second arg to pass into the function
     * @param mapper  A custom mapper to seialize individual values
     * @example hassubsequence(my.items, [1, 2, 3])
     */
    hassubsequence<TArrayType>(
        collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * An OData "+" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example add(my.property, 4)
     */
    add(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "-" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example sub(my.property, 4)
     */
    sub(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "-" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example sub(4, my.property)
     */
    sub(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "*" operation
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example mul(my.property, 4)
     */
    mul(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on integers
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example div(my.property, 4)
     */
    div(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on integers
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example div(4, my.property)
     */
    div(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on decimals
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example divby(my.property, 4)
     */
    divby(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on decimals
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example divby(4, my.property)
     */
    divby(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "%" operation on decimals
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example mod(my.property, 4)
     */
    mod(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "%" operation on decimals
     * @param lhs  The left operand
     * @param rhs  The right operand
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * @example mod(4, my.property)
     */
    mod(lhs: Operable<number> | number, rhs: Operable<number>, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "concat" operation
     * @param lhs  The first value to concatenate
     * @param rhs  The second value to concatenate
     * @example concatString(my.property, "hello")
     */
    concatString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "concat" operation
     * @param lhs  The first value to concatenate
     * @param rhs  The second value to concatenate
     * @example concatString("hello", my.property)
     */
    concatString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example containsString(my.fullName, "Bob")
     */
    containsString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example containsString("Bob Jones", my.firstName)
     */
    containsString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example containsString(my.fullName, "Bob")
     */
    containsString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "contains" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example containsString("Bob Jones", my.firstName)
     */
    containsString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "matchesPattern" operation
     * @param string  The value to test for the existence of rhs
     * @param pattern  The pattern to test lhs for the existence of
     * @example matchesPattern(my.fullName, "^Bob*")
     */
    matchesPattern(string: Operable<string>, pattern: Operable<string> | string): Filter;

    /**
     * An OData "matchesPattern" operation
     * @param string  The pattern to test rhs for the existence of
     * @param pattern  The value to test for the existence of lhs
     * @example matchesPattern("Bob Jones", my.namePattern)
     */
    matchesPattern(string: Operable<string> | string, pattern: Operable<string>): Filter;

    /**
     * An OData "tolower" operation
     * @param string  The pattern to test rhs for the existence of
     * @example toLower(my.name)
     */
    toLower(string: Operable<string>): Filter;

    /**
     * An OData "toupper" operation
     * @param string  The pattern to test rhs for the existence of
     * @example toUpper(my.name)
     */
    toUpper(string: Operable<string>): Filter;

    /**
     * An OData "trim" operation
     * @param string  The pattern to test rhs for the existence of
     * @example trim(my.name)
     */
    trim(string: Operable<string>): Filter;

    /**
     * An OData "startswith" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example startsWithString(my.fullName, "B")
     */
    startsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "startswith" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example startsWithString("Bob Jones", my.firstName)
     */
    startsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "endswith" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example endsWithString(my.fullName, "Jones")
     */
    endsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "endswith" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example endsWithString("Bob Jones", my.lastName)
     */
    endsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "indexof" operation
     * @param lhs  The value to test for the existence of rhs
     * @param rhs  The value to test lhs for the existence of
     * @example indexOfString(my.fullName, "Bob")
     */
    indexOfString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "indexof" operation
     * @param lhs  The value to test rhs for the existence of
     * @param rhs  The value to test for the existence of lhs
     * @example indexOfString("Bob Jones", my.firstName)
     */
    indexOfString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "length" operation
     * @param lhs The string property to measure
     * @example length(my.firstName)
     */
    lengthString(lhs: Operable<string>): Filter;

    /**
     * An OData "substring" operation
     * @param lhs The string property to divide
     * @param start The position to start the division
     * @param length The length of the substring
     * @example subString(my.firstName, 5, 6)
     */
    subString(lhs: Operable<string>, start: number, end?: number): Filter;

    /**
     * An OData "ceiling" operation
     * @param lhs The number to execute a ceiling operation on
     * @param result The expected result type. Default: Int32
     * @example ceiling(my.score)
     */
    ceiling(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "floor" operation
     * @param lhs The number to execute a floor operation on
     * @param result The expected result type. Default: Int32
     * @example floor(my.score)
     */
    floor(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "round" operation
     * @param lhs The number to execute a round operation on
     * @param result The expected result type. Default: Int32
     * @example round(my.score)
     */
    round(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "add" operation on a DateTimeOffset
     * @param lhs The date to add to
     * @param rhs The time to add
     * @example addTime(my.appointmentTime, new ODataDuration({h: 1, m: 30}))
     */
    addTime(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "add" operation on a Duration
     * @example addTime(my.appointmentLength, new ODataDuration({h: 1, m: 30}))
     */
    addTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset): Filter;

    /**
     * An OData "add" operation on a DateTimeOffset
     * @param lhs The time to add
     * @param rhs The date to add to
     * @example addTime(my.appointmentLength, new ODataDateTimeOffset({y: 2001, M: 2, d: 10}))
     */
    addTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "sub" operation on a DateTimeOffset
     * @param lhs The date to add to
     * @param rhs The time to add
     * @example subTime(my.appointmentTime, new ODataDuration({h: 1, m: 30}))
     */
    subTime(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "sub" operation on a Duration
     * @example subTime(my.appointmentLength, new ODataDuration({h: 1, m: 30}))
     */
    subTime(lhs: EdmDateTimeOffset, rhs: Operable<EdmDuration>): Filter;

    /**
     * An OData "add" operation on a DateTimeOffset
     * @param lhs The time to add
     * @param rhs The date to add to
     * @example subTime(my.appointmentLength, new ODataDateTimeOffset({y: 2001, M: 2, d: 10}))
     */
    subTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;

    /**
     * An OData "mul" operation on a Duration
     * @example mulTime(my.appointmentLength, 1.5)
     */
    mulTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

    /**
     * An OData "div" operation on a Duration
     * @example divTime(my.appointmentLength, 1.5)
     */
    divTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

    /**
     * An OData "divby" operation on a Duration
     * @example divByTime(my.appointmentLength, 1.5)
     */
    divByTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter;

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
     * @example caseExpression(
     *  [gt(x, 0), filterRaw("1", IntegerTypes.Int32)],
     *  [lt(x, 0), filterRaw("-1", IntegerTypes.Int32)],
     *  [true, filterRaw("0", IntegerTypes.Int32)])
     */
    caseExpression(...cases: [Filter | true, Filter][]): Filter

}

export function newUtils(): FilterUtils {
    return {
        filterRaw,
        logicalOp: logicalInfixOp,
        eq,
        isIn,
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
        hassubset,
        hassubsequence,
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
        addTime,
        subTime,
        mulTime,
        divTime,
        divByTime,
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