import { Filter, FilterEnv, FilterResult, QbEmit } from "../../queryBuilder.js";
import { QueryCollection, QueryObject, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { asOperable, combineFilterStrings, Operable, operableToFilter, valueToFilter } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";
import { ODataTypeRef } from "../../../index.js";
import { ReaderWriter } from "../../utils.js";
import { functionCall } from "./op1.js";
import { executeQueryBuilder } from "../../entitySet/addQuery.js";
import { params } from "../../entitySet/params.js";

export type OperableCollection<T> = QueryCollection<QueryObject<T>, T> | Filter

const bool = resolveOutputType(NonNumericTypes.Boolean)
const int32 = resolveOutputType(IntegerTypes.Int32)

export function collectionFilter<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    operator: string,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    const collectionFilter = operableToFilter(collection)
    const itemFilter = collectionItemOperation(collection.childObjConfig)
        .map(x => ({
            ...x,
            $$filter: `(${collection.childObjAlias}:${x.$$filter})`
        }))

    return combineFilterStrings(`/${operator}`, bool, collectionFilter, itemFilter);
}

export function collectionFunction<TArrayType>(
    functionName: string,
    collection: OperableCollection<TArrayType>,
    values: OperableCollection<TArrayType> | TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {
    return _collectionFunction(functionName, collection, values, mapper, () => bool)
}

function filterize<TArrayType>(
    toFilterize: OperableCollection<TArrayType> | Filter | TArrayType[],
    supplimentary: OperableCollection<TArrayType> | Filter,
    mapper: ((x: TArrayType) => string) | undefined) {

    if (!Array.isArray(toFilterize)) {
        return operableToFilter(toFilterize)
    }

    const mapperA = mapper && ((xs: TArrayType[]) => `[${xs.map(mapper).join(",")}]`)

    return operableToFilter(supplimentary)
        .bind(({ $$output }) => valueToFilter(toFilterize, $$output, mapperA))
}

function filterizeSingle<TArrayType>(
    toFilterize: Operable<TArrayType> | TArrayType,
    supplimentary: OperableCollection<TArrayType> | Filter,
    mapper: ((x: TArrayType) => string) | undefined) {

    const toFilterizeO = asOperable(toFilterize)
    if (toFilterizeO) {
        return operableToFilter(toFilterizeO)
    }

    return new Filter(
        operableToFilter(supplimentary).wrapped
            .map(({ $$output }) => ({
                $$output: ($$output.isCollection && $$output.collectionType) || $$output
            }))
            .bind(({ $$output }) => valueToFilter(toFilterize as TArrayType, $$output, mapper).wrapped))
}

function _collectionFunction<TArrayType>(
    functionName: string,
    collection: OperableCollection<TArrayType> | Filter | TArrayType[],
    values: OperableCollection<TArrayType> | Filter | TArrayType[],
    mapper: ((x: TArrayType) => string) | undefined,
    output: (ts: [FilterResult, FilterResult]) => ODataTypeRef): Filter {

    if (Array.isArray(collection)) {
        /* istanbul ignore next */
        if (Array.isArray(values)) {
            throw new Error("Invalid method overload")
        }

        collection = filterize(collection, values, mapper);
    }

    if (Array.isArray(values)) {
        /* istanbul ignore next */
        if (Array.isArray(collection)) {
            throw new Error("Invalid method overload")
        }

        values = filterize(values, collection, mapper);
    }

    const _collection = operableToFilter(collection)
    const _values = operableToFilter(values)
    const inputs = ReaderWriter.traverse([_collection.wrapped, _values.wrapped], QbEmit.zero) as ReaderWriter<FilterEnv, [FilterResult, FilterResult], QbEmit>

    return new Filter(inputs.bind(is =>
        functionCall(functionName, [_collection, _values], output(is)).wrapped));
}

export function any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "any", collectionItemOperation);
}

export function all<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
    collection: QueryCollection<TQueryObj, TArrayType>,
    collectionItemOperation: ((t: TQueryObj) => Filter)): Filter {

    return collectionFilter(collection, "all", collectionItemOperation);
}

export function count<T>(collection: OperableCollection<T>, countUnit = IntegerTypes.Int32): Filter {
    return operableToFilter(collection)
        .map(x => ({
            $$output: resolveOutputType(countUnit),
            $$filter: `${x.$$filter}/$count`
        }))
}

export function $filter<TRoot, T, TQuery extends QueryObject<T>>(collection: QueryCollection<TQuery, T> | Filter, itemFilter: (item: TQuery) => Filter): Filter {

    return new Filter(
        operableToFilter(collection).wrapped
            .bind(x => ReaderWriter
                .create<FilterEnv, ReaderWriter<FilterEnv, FilterResult, QbEmit>, QbEmit>(env => {

                    if (!x.$$output.isCollection) {
                        /* istanbul ignore next */
                        throw new Error(`$filter can only be done on collections. `
                            + `Attempting to execute on ${x.$$output.namespace && `${x.$$output.namespace}/`}${x.$$output.name}`);
                    }

                    // https://github.com/ShaneGH/magic-odata/issues/60
                    /* istanbul ignore next */
                    if (x.$$output.collectionType.isCollection) {
                        throw new Error("Collections of collections are not supported");
                    }

                    const paramsBuilder = params<TRoot>(env.rootUri, env.serviceConfig, env.serializerSettings, env.schema);
                    return [
                        executeQueryBuilder<TRoot, TQuery, Filter>(x.$$output.collectionType, env.serializerSettings, itemFilter, "$this", paramsBuilder)
                            .wrapped
                            .mapEnv<FilterEnv>(env => ({ ...env, rootContext: "$this" }))
                            .map(({ $$filter }) => ({
                                $$output: x.$$output,
                                $$filter: `${x.$$filter}/$filter(${$$filter})`
                            })),
                        QbEmit.zero
                    ]
                }))
            .bind(x => x))
}

export function hasSubset<TArrayType>(
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubset", collection, values, mapper, () => bool);
}

export function hasSubSequence<TArrayType>(
    collection: QueryCollection<QueryPrimitive<TArrayType>, TArrayType>,
    values: TArrayType[],
    mapper?: (x: TArrayType) => string): Filter {

    return _collectionFunction("hassubsequence", collection, values, mapper, () => bool);
}

export function concat<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function concat<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        /* istanbul ignore next */
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("concat", lhs, rhs, mapper, xs => xs.map(x => x.$$output).filter(x => !!x)[0]);
}

export function endsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function endsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        /* istanbul ignore next */
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("endswith", lhs, rhs, mapper, () => bool);
}

export function startsWith<T>(lhs: OperableCollection<T>, rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T>, mapper?: (x: T) => string): Filter;
export function startsWith<T>(lhs: OperableCollection<T> | T[], rhs: OperableCollection<T> | T[], mapper?: (x: T) => string): Filter {

    if (Array.isArray(lhs)) {
        /* istanbul ignore next */
        if (Array.isArray(rhs)) {
            throw new Error("Invalid method overload");
        }
    }

    return _collectionFunction("startswith", lhs, rhs, mapper, () => bool);
}

function singleValuedFunction<T>(
    name: string,
    lhs: OperableCollection<T> | T[],
    rhs: Operable<T> | T,
    mapper: ((x: T) => string) | undefined,
    output: ODataTypeRef) {

    let rhsO = asOperable(rhs);
    if (Array.isArray(lhs)) {
        /* istanbul ignore next */
        if (!rhsO) {
            throw new Error("Invalid method overload")
        }

        lhs = filterize(lhs, rhsO, mapper);
    }

    lhs = operableToFilter(lhs);
    rhsO ??= filterizeSingle(rhs, lhs, mapper);

    return combineFilterStrings(",", output, lhs, rhsO)
        .map(x => ({
            ...x,
            $$filter: `${name}(${x.$$filter})`
        }))
}

export function contains<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;
export function contains<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T> | Operable<T> | T, mapper?: (x: T) => string): Filter {

    return singleValuedFunction("contains", lhs, rhs, mapper, bool);
}

export function indexOf<T>(lhs: OperableCollection<T>, rhs: Operable<T> | T, mapper?: (x: T) => string): Filter;
export function indexOf<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T>, mapper?: (x: T) => string): Filter;
export function indexOf<T>(lhs: OperableCollection<T> | T[], rhs: Operable<T> | Operable<T> | T, mapper?: (x: T) => string): Filter {

    return singleValuedFunction("indexof", lhs, rhs, mapper, int32);
}

export function length<T>(collection: OperableCollection<T>): Filter {

    return operableToFilter(collection)
        .map(({ $$filter }) => ({
            $$output: int32,
            $$filter: `length(${$$filter})`
        }));
}

export function subString<T>(lhs: OperableCollection<T>, start: number, length?: number): Filter {

    return operableToFilter(lhs)
        .map(({ $$filter, $$output }) => ({
            $$output,
            $$filter: length == null
                ? `substring(${$$filter},${start})`
                : `substring(${$$filter},${start},${length})`
        }));
}