import { QueryCollection, QueryObject, QueryPrimitive } from "../typeRefBuilder.js";
import { add, ceiling, div, divby, floor, mod, mul, round, sub } from "./filtering/arithmetic2.js";
import { all, any, collectionFilter, collectionFunction, count, hassubset, OperableCollection } from "./filtering/collection1.js";
import {
    concat as concatString, contains as containsString, startsWith as startsWithString,
    endsWith as endsWithString, indexOf as indexOfString, length as lengthString, subString
} from "./filtering/string1.js";
import { and, eq, ge, group, gt, isIn, le, logicalInfixOp, lt, ne, not, or } from "./filtering/logical2.js";
import { FilterablePaths, FilterableProps, filterRaw } from "./filtering/op1.js";
import { Operable } from "./filtering/operable0.js";
import { IntegerTypes, OutputTypes, RealNumberTypes } from "./filtering/queryPrimitiveTypes0.js";
import { Filter } from "../queryBuilder.js";

export type FilterUtils = {
    /**
     * Do a custom filter operation. If mixing this operation with other
     * filtering operations, it is best to include an output type so that values
     * can be serialized correctly
     * 
     * @param filter  A basic filter string
     * 
     * @param outputType  Add this parameter if you are using 
     * the output of this filter with some of the other built in filters:
     * e.g. eq(my.val1, op(my.val2, p => `${p} add 1`, OutputTypes.Int32)). 
     * e.g. lt(my.minAge, op(`age add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * 
     * @example op("property eq 'hello'")
     */
    filterRaw(filter: string, outputType?: OutputTypes | undefined): Filter;

    /**
     * Do a custom filter operation using the path of an item.
     *
     * @param obj  The root object of this filter operation. 
     * The root object can be any object available to the query. 
     * It does not have to be the query root object
     * 
     * @param filter  A function to build the filter as a string. 
     * The input is a reference to the root object param
     * The filter should return an unencoded filter string
     * 
     * @param outputType  Add this parameter if you are using 
     * the output of this filter with some of the other built in filters:
     * e.g. lt(my.minAge, op({ age: my.age }, p => `${p.age} add 1`, OutputTypes.Int32)). 
     * This will help the filter utils to serialize data correctly.
     * 
     * @example op({ property: my.property }, p => `${p.property} eq 'hello'`)
     */
    filterRaw(obj: FilterableProps, filter: (path: FilterablePaths) => string, outputType?: OutputTypes | undefined): Filter;

    /**
     * Do a custom filter operation with a given operator. The result of the operation should be a boolean
     *
     * @param lhs  The left operand
     * 
     * @param operator  The operation
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example logicalOp(my.property, "eq", "hello")
     */
    logicalOp<T>(lhs: Operable<T>, operator: string, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "==" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example eq(my.property, "hello")
     */
    eq<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "in" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example isIn(my.property, [1, 3])
     */
    isIn<T>(lhs: Operable<T>, rhs: T[] | OperableCollection<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "!=" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example ne(my.property, "hello")
     */
    ne<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "<" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example lt(my.property, 4)
     */
    lt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "<=" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example le(my.property, 4)
     */
    le<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData ">" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example gt(my.property, 4)
     */
    gt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData ">=" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
     * 
     * @example ge(my.property, 4)
     */
    ge<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter;

    /**
     * An OData "not(...)" operation
     *
     * @param condition  The value from a previous filter
     * 
     * @param group - true If true, will surround the condition in (...).
     * 
     * @example not(eq(my.property, 4))
     */
    not(condition: Filter, group?: boolean): Filter;

    /**
     * Surrounds a filter value in (...)
     *
     * @param condition  The value from a previous filter
     * 
     * @example and( group(eq(my.property1, 4)), group(eq(my.property2, 4)) )
     */
    group(condition: Filter): Filter;

    /**
     * An OData "and" operation
     *
     * @param conditions  The values from a previous filter
     * 
     * @example and( eq(my.property1, 4), eq(my.property2, 4) )
     */
    and(...conditions: Filter[]): Filter;

    /**
     * An OData "or" operation
     *
     * @param conditions  The values from a previous filter
     * 
     * @example or( eq(my.property1, 4), eq(my.property2, 4) )
     */
    or(...conditions: Filter[]): Filter;

    /**
     * Do a filter operation on the elelments of a collection. The filter result should be a boolean
     *
     * @param collection  The collection
     * 
     * @param operator  The operator used to expand the collection (e.g. any, all)
     * 
     * @param collectionItemOperation  The operation on individual collection items
     * 
     * @example collectionFilter(my.items, "any", item => eq(item, 4))
     */
    collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        operator: string,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Call a function on a collection. The result of this function should be a boolean
     * 
     * @param functionName  The function to call (e.g. hassubset)
     *
     * @param collection  The collection
     * 
     * @param values  The second arg to pass into the function
     * 
     * @param mapper  A custom mapper to seialize individual values
     * 
     * @example collectionFunction("hassubset", my.items, [1, 2, 3])
     */
    collectionFunction<TArrayType>(
        functionName: string,
        collection: OperableCollection<TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * Do an OData "any" operation on a collection
     *
     * @param collection  The collection
     * 
     * @param collectionItemOperation  The operation on individual collection items
     * 
     * @example any(my.items, item => eq(item, 4))
     */
    any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "all" operation on a collection
     *
     * @param collection  The collection
     * 
     * @param collectionItemOperation  The operation on individual collection items
     * 
     * @example all(my.items, item => eq(item, 4))
     */
    all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;

    /**
     * Do an OData "$count" operation on a collection
     *
     * @param collection  The collection
     * 
     * @param countUnit - IntegerTypes.Int32 The expected result of the type
     * 
     * @example count(my.items)
     */
    count(collection: QueryCollection<any, any>, countUnit?: IntegerTypes): QueryPrimitive<Number>;

    /**
     * Call the "hassubset" function on a collection
     *
     * @param collection  The collection
     * 
     * @param values  The second arg to pass into the function
     * 
     * @param mapper  A custom mapper to seialize individual values
     * 
     * @example hassubset(my.items, [1, 2, 3])
     */
    hassubset<TArrayType>(
        collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
        values: TArrayType[],
        mapper?: (x: TArrayType) => string): Filter;

    /**
     * An OData "+" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example add(my.property, 4)
     */
    add(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "-" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example sub(my.property, 4)
     */
    sub(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "*" operation
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example mul(my.property, 4)
     */
    mul(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on integers
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example div(my.property, 4)
     */
    div(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "/" operation on decimals
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example divby(my.property, 4)
     */
    divby(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "%" operation on decimals
     *
     * @param lhs  The left operand
     * 
     * @param rhs  The right operand
     * 
     * @param resultType  The expected type of the result. Default: choose the most appropriate type based on the input types.
     * 
     * @example mod(my.property, 4)
     */
    mod(lhs: Operable<number>, rhs: Operable<number> | number, resultType?: RealNumberTypes | undefined): Filter;

    /**
     * An OData "concat" operation
     *
     * @param lhs  The first value to concatenate
     * 
     * @param rhs  The second value to concatenate
     * 
     * @example concatString(my.property, "hello")
     */
    concatString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "concat" operation
     *
     * @param lhs  The first value to concatenate
     * 
     * @param rhs  The second value to concatenate
     * 
     * @example concatString("hello", my.property)
     */
    concatString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "contains" operation
     *
     * @param lhs  The value to test for the existence of rhs
     * 
     * @param rhs  The value to test lhs for the existence of
     * 
     * @example containsString(my.fullName, "Bob")
     */
    containsString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "contains" operation
     * 
     * @param lhs  The value to test rhs for the existence of
     *
     * @param rhs  The value to test for the existence of lhs
     * 
     * @example containsString("Bob Jones", my.firstName)
     */
    containsString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "startswith" operation
     *
     * @param lhs  The value to test for the existence of rhs
     * 
     * @param rhs  The value to test lhs for the existence of
     * 
     * @example startsWithString(my.fullName, "B")
     */
    startsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "startswith" operation
     * 
     * @param lhs  The value to test rhs for the existence of
     *
     * @param rhs  The value to test for the existence of lhs
     * 
     * @example startsWithString("Bob Jones", my.firstName)
     */
    startsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "endswith" operation
     *
     * @param lhs  The value to test for the existence of rhs
     * 
     * @param rhs  The value to test lhs for the existence of
     * 
     * @example endsWithString(my.fullName, "Jones")
     */
    endsWithString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "endswith" operation
     * 
     * @param lhs  The value to test rhs for the existence of
     *
     * @param rhs  The value to test for the existence of lhs
     * 
     * @example endsWithString("Bob Jones", my.lastName)
     */
    endsWithString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "indexof" operation
     *
     * @param lhs  The value to test for the existence of rhs
     * 
     * @param rhs  The value to test lhs for the existence of
     * 
     * @example indexOfString(my.fullName, "Bob")
     */
    indexOfString(lhs: Operable<string>, rhs: Operable<string> | string): Filter;

    /**
     * An OData "indexof" operation
     * 
     * @param lhs  The value to test rhs for the existence of
     *
     * @param rhs  The value to test for the existence of lhs
     * 
     * @example indexOfString("Bob Jones", my.firstName)
     */
    indexOfString(lhs: Operable<string> | string, rhs: Operable<string>): Filter;

    /**
     * An OData "length" operation
     * 
     * @param lhs The string property to measure
     * 
     * @example length(my.firstName)
     */
    lengthString(lhs: Operable<string>): Filter;

    /**
     * An OData "substring" operation
     * 
     * @param lhs The string property to divide
     * 
     * @param start The position to start the division
     * 
     * @param length The length of the substring
     * 
     * @example subString(my.firstName, 5, 6)
     */
    subString(lhs: Operable<string>, start: number, end?: number): Filter;

    /**
     * An OData "ceiling" operation
     * 
     * @param lhs The number to execute a ceiling operation on
     * 
     * @param result The expected result type. Default: Int32
     * 
     * @example ceiling(my.score)
     */
    ceiling(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "floor" operation
     * 
     * @param lhs The number to execute a floor operation on
     * 
     * @param result The expected result type. Default: Int32
     * 
     * @example floor(my.score)
     */
    floor(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    /**
     * An OData "round" operation
     * 
     * @param lhs The number to execute a round operation on
     * 
     * @param result The expected result type. Default: Int32
     * 
     * @example round(my.score)
     */
    round(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter;

    // https://github.com/ShaneGH/magic-odata/issues/9
    // /**
    //  * An OData "concat" operation
    //  *
    //  * @param lhs  The first value to concatenate
    //  * 
    //  * @param rhs  The second value to concatenate
    //  * 
    //  * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
    //  * 
    //  * @example concatCollection(my.property, [1, 2, 3])
    //  */
    // concatCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;

    // /**
    //  * An OData "concat" operation
    //  *
    //  * @param lhs  The first value to concatenate
    //  * 
    //  * @param rhs  The second value to concatenate
    //  * 
    //  * @param mapper  An optional mapper to map any primitives to a string. The mapper should return values unencoded
    //  * 
    //  * @example concatCollection([1, 2, 3], my.property)
    //  */
    // concatCollection<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;

    // /**
    //  * An OData "contains" operation
    //  *
    //  * @param lhs  The value to test for the existence of rhs
    //  * 
    //  * @param rhs  The value to test lhs for the existence of
    //  * 
    //  * @example containsCollection(my.values, 1)
    //  */
    // containsCollection<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T, mapper?: (x: T) => string): Filter;

    // /**
    //  * An OData "contains" operation
    //  * 
    //  * @param lhs  The value to test rhs for the existence of
    //  *
    //  * @param rhs  The value to test for the existence of lhs
    //  * 
    //  * @example containsCollection([1, 2, 3], my.value)
    //  */
    // containsCollection<T>(lhs: OperableCollection<T> | T, rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
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
        any,
        all,
        count,
        hassubset,
        add,
        sub,
        mul,
        div,
        divby,
        mod,
        concatString,
        containsString,
        startsWithString,
        endsWithString,
        indexOfString,
        lengthString,
        subString,
        ceiling,
        floor,
        round
    }
}