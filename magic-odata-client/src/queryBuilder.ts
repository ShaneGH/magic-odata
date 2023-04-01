import { ODataSchema, ODataServiceConfig, ODataTypeRef } from "magic-odata-shared";
import { ODataUriParts } from "./entitySet/requestTools.js";
import { NonNumericTypes, resolveOutputType } from "./query/filtering/queryPrimitiveTypes0.js";
import { groupBy, mapDict, ReaderWriter, removeNulls, Writer } from "./utils.js";
import { AtParam, ParameterDefinition, serialize } from "./valueSerializer.js";

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

export type ExpandResult = Writer<string, QbEmit>

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
    static readonly zero = new QbEmit([], [])

    /** @param params: the inner list might mutate */
    constructor(
        public readonly params: ParameterDefinition[][],
        public readonly paramTypes: [AtParam, ODataTypeRef][]) {

    }

    static maybeZero(params?: ParameterDefinition[][] | null, paramTypes?: [AtParam, ODataTypeRef][]) {
        if (params?.length || paramTypes?.length) {
            return new QbEmit(params || [], paramTypes || [])
        }

        return QbEmit.zero
    }

    concat(other: QbEmit) {
        if (this === QbEmit.zero) return other
        if (other === QbEmit.zero) return this

        return new QbEmit(
            this.params.concat(other.params),
            this.paramTypes.concat(other.paramTypes))
    }
}

export type Filter = ReaderWriter<FilterEnv, FilterResult, QbEmit>

export type Query = Top | Skip | Count | Expand | OrderBy | Select | Filter | Custom | Search

type QueryAccumulator = Writer<Dict<string>, QbEmit>

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
        }, Writer.create<Dict<string>, QbEmit>({}, QbEmit.zero));
}

export function buildQuery(types: Dict<ODataSchema>, buildUri: BuildUri,
    qbEmit: QbEmit, q: Query | Query[], filterEnv: FilterEnv, encode = true): Dict<string> {

    const pq = buildPartialQuery(q, filterEnv, encode)
        .bind(x => Writer.create(x, qbEmit))

    return merge(types, buildUri, pq, encode)
}

function appendTypes(dataParams: ParameterDefinition[], paramTypeResolutions: [AtParam, ODataTypeRef][]) {
    return dataParams
        .map(x => {
            if (x.type !== "Const" || x.data.paramType) return x

            const t = paramTypeResolutions.find(m => m[0].name === x.data.name)
            if (!t) return x

            return {
                ...x,
                data: {
                    ...x.data,
                    paramType: t[1]
                }
            }
        })
}

const stringT = resolveOutputType(NonNumericTypes.String)

function merge(types: Dict<ODataSchema>, buildUri: BuildUri,
    acc: QueryAccumulator, encode: boolean): Dict<string> {
    const [params, _dataParams] = acc.execute()

    let dataParams = appendTypes(_dataParams.params.reduce((s, x) => [...s, ...x], []), _dataParams.paramTypes)
    verifyAllParamsAreDefined(dataParams)

    const stringify = encode
        ? (x: any) => encodeURIComponent(JSON.stringify(x))
        : (x: any) => JSON.stringify(x)

    const _serialize: typeof serialize = encode
        ? (x, y, z) => serialize(x, y, z, true).map(encodeURIComponent)
        : (x, y, z) => serialize(x, y, z, true)

    const serializedDataParams = removeNulls(dataParams
        .map(d => d.type === "Const"
            ? {
                k: d.data.name,
                v: d.data.paramType
                    ? _serialize(d.data.value, d.data.paramType, types).execute()[0]
                    : typeof d.data.value === "string"
                        ? _serialize(d.data.value, stringT, types).execute()[0]
                        : stringify(d.data.value)
            }
            : d.type === "Ref"
                ? {
                    k: d.data.name,
                    v: stringify({ "@odata.id": buildUri(d.data.uri.uri(false)) })
                }
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
