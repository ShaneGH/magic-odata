import { ODataSchema, ODataServiceConfig, ODataTypeRef } from "magic-odata-shared";
import { ParameterDefinition, params } from "./entitySet/params.js";
import { ODataUriParts } from "./entitySet/requestTools.js";
import { NonNumericTypes, OutputTypes, resolveOutputType } from "./query/filtering/queryPrimitiveTypes0.js";
import { groupBy, mapDict, ReaderWriter, removeNulls, Writer } from "./utils.js";
import { serialize } from "./valueSerializer.js";

type Dict<T> = { [key: string]: T }

export type QueryParts = Partial<{
    select: Select
    filter: Filter
    expand: Expand,
    orderBy: OrderBy,
    top: Top,
    skip: Skip,
    count: Count
}>

export type Top = {
    $$oDataQueryObjectType: "Top"
    $$top: number
}

export type Skip = {
    $$oDataQueryObjectType: "Skip"
    $$skip: number
}

export type Count = {
    $$oDataQueryObjectType: "Count"
}

export type ExpandResult = Writer<string, ParameterDefinition[][]>

export type Expand = {
    $$oDataQueryObjectType: "Expand"
    $$expand: (env: FilterEnv) => ExpandResult
}

export type OrderBy = {
    $$oDataQueryObjectType: "OrderBy"
    $$orderBy: string
}

export type Custom = {
    $$oDataQueryObjectType: "Custom"
    $$key: string
    $$value: string
}

export type Select = {
    $$oDataQueryObjectType: "Select"
    $$select: string
}

export type Search = {
    $$oDataQueryObjectType: "Search"
    $$search: string
}

export type FilterResult = {
    $$filter: string
    $$output: ODataTypeRef
}

export type BuildUri = (uriParts: ODataUriParts) => string

export type FilterEnv = {
    rootUri: string
    buildUri: BuildUri
    serviceConfig: ODataServiceConfig
    schema: ODataSchema
    rootContext: string
}

export class QbEmit {
    static readonly zero = new QbEmit([])

    /** @param params: the inner list might mutate */
    constructor(public readonly params: ParameterDefinition[][]) {

    }

    concat(other: QbEmit) {
        if (this === QbEmit.zero) return other
        if (other === QbEmit.zero) return this

        return new QbEmit(this.params.concat(other.params))
    }
}

export type Filter = ReaderWriter<FilterEnv, FilterResult, QbEmit>

export type Query = Top | Skip | Count | Expand | OrderBy | Select | Filter | Custom | Search

type QueryAccumulator = Writer<Dict<string>, ParameterDefinition[][]>

function maybeAdd(encode: boolean, s: QueryAccumulator, stateProp: string, inputProp: string | undefined,
    errorMessage: string): QueryAccumulator {

    return s.map(state => {

        if (state[stateProp]) {
            throw new Error(errorMessage)
        }

        return inputProp ? {
            ...state,
            [stateProp]: encode
                ? encodeURIComponent(inputProp)
                : inputProp
        } : state
    })
}

function verifyAllParamsAreDefined(allParams: ParameterDefinition[]) {
    const grouped = groupBy(allParams, x => x.data.name)
    const notDefined = Object
        .keys(grouped)
        .filter(param => grouped[param].every(x => x.type === "Param"))
        .map(param => `Param ${param} is referenced but not defined`)
        .join("\n")

    if (notDefined) {
        throw new Error(`${notDefined}\nUse the "createRef" or "createConst" methods to define a param`)
    }
}

export function buildPartialQuery(q: Query | Query[], filterEnv: FilterEnv, encode = true): QueryAccumulator {
    if (!Array.isArray(q)) {
        return buildPartialQuery([q], filterEnv, encode)
    }

    return q
        .reduce((s, x) => {

            if (x instanceof ReaderWriter) {
                return x
                    .asWriter(filterEnv)
                    .mapAcc(x => x.params)
                    .bind(applied => maybeAdd(encode, s, "$filter", applied.$$filter,
                        "Multiple expansions detected. Combine multipe expansions with the $filter.and or $filter.or utils"))
            }

            if (x.$$oDataQueryObjectType === "Expand") {
                return x
                    .$$expand(filterEnv)
                    .bind(applied => maybeAdd(encode, s, "$expand", applied,
                        "Multiple expansions detected. Combine multipe expansions with the $expand.combine util"));
            }

            if (x.$$oDataQueryObjectType === "OrderBy") {
                return maybeAdd(encode, s, "$orderBy", x.$$orderBy, "Multiple order by clauses detected");
            }

            if (x.$$oDataQueryObjectType === "Select") {
                return maybeAdd(encode, s, "$select", x.$$select, "Multiple select clauses detected");
            }

            if (x.$$oDataQueryObjectType === "Custom") {
                return maybeAdd(encode, s, x.$$key, x.$$value, "Multiple custom clauses detected");
            }

            if (x.$$oDataQueryObjectType === "Search") {
                return maybeAdd(encode, s, "$search", x.$$search, "Multiple search clauses detected");
            }

            if (x.$$oDataQueryObjectType === "Top") {
                return maybeAdd(encode, s, "$top", x.$$top.toString(), "Multiple top clauses detected");
            }

            if (x.$$oDataQueryObjectType === "Count") {
                return maybeAdd(encode, s, "$count", "true", "Multiple count clauses detected");
            }

            return maybeAdd(encode, s, "$skip", x.$$skip.toString(), "Multiple skip clauses detected");
        }, Writer.create<Dict<string>, ParameterDefinition[][]>({}, []));
}

export function buildQuery(types: Dict<ODataSchema>, buildUri: BuildUri, q: Query | Query[], filterEnv: FilterEnv, mutableDataParams: ParameterDefinition[][], encode = true): Dict<string> {

    const pq = buildPartialQuery(q, filterEnv, encode)
        .bind(x => Writer.create(x, mutableDataParams))

    return merge(types, buildUri, pq, encode)
}

const stringT = resolveOutputType(NonNumericTypes.String)

function merge(types: Dict<ODataSchema>, buildUri: BuildUri, acc: QueryAccumulator, encode: boolean): Dict<string> {
    const [params, _dataParams] = acc.execute()

    // once the partial query is built, mutableDataParams **should** be finished mutating
    const dataParams = _dataParams.reduce((s, x) => [...s, ...x], [])
    verifyAllParamsAreDefined(dataParams)

    const stringify = encode
        ? (x: any) => encodeURIComponent(JSON.stringify(x))
        : (x: any) => JSON.stringify(x)

    const _serialize: typeof serialize = encode
        ? (x, y, z) => encodeURIComponent(serialize(x, y, z))
        : (x, y, z) => serialize(x, y, z)

    const serializedDataParams = removeNulls(dataParams
        .map(d => d.type === "Const"
            ? {
                k: d.data.name,
                v: d.data.paramType
                    ? _serialize(d.data.value, d.data.paramType, types)
                    : typeof d.data.value === "string"
                        ? _serialize(d.data.value, stringT, types)
                        : stringify(d.data.value)
            }
            : d.type === "Ref"
                ? { k: d.data.name, v: stringify({ "@odata.id": buildUri(d.data.uri.uri(false)) }) }
                : null))

    const newParamsDict = mapDict(
        groupBy(serializedDataParams, ({ k }) => k), vs => vs.map(({ v }) => v))

    const err = Object
        .keys(newParamsDict)
        .map(k => newParamsDict[k].length > 1 || params[k]
            ? `Data parameter ${k} is defined more than once`
            : null)
        .filter(x => !!x)
        .join("\n")

    if (err) {
        throw new Error(err);
    }

    return serializedDataParams
        .reduce((s, x) => ({
            ...s,
            [x.k]: x.v
        }), params)
}