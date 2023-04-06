import { ODataSchema, ODataServiceConfig, ODataTypeRef } from "magic-odata-shared";
import { ODataUriParts } from "./entitySet/requestTools.js";
import { NonNumericTypes, resolveOutputType } from "./query/filtering/queryPrimitiveTypes0.js";
import { dir, groupBy, ReaderWriter, removeNulls, Writer } from "./utils.js";
import { AtParam, SerializerSettings, rawType, serialize } from "./valueSerializer.js";
import { extractAtParams } from "./query/root.js";

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
    $$orderBy: Writer<string, QbEmit>
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
    serializerSettings: SerializerSettings
    schema: ODataSchema
    rootContext: string
}

export class QbEmit {
    static readonly zero = new QbEmit([], [])

    /** @param params: the inner list might mutate */
    constructor(
        public readonly paramTypes: [AtParam, ODataTypeRef][],
        public readonly untypedparamTypes: AtParam[]) {
    }

    static maybeZero(
        paramTypes?: [AtParam, ODataTypeRef][],
        untypedparamTypes?: AtParam[]) {

        if (paramTypes?.length || untypedparamTypes?.length) {
            return new QbEmit(paramTypes || [], untypedparamTypes || [])
        }

        return QbEmit.zero
    }

    concat(other: QbEmit) {
        if (this === QbEmit.zero) return other
        if (other === QbEmit.zero) return this

        return new QbEmit(
            this.paramTypes.concat(other.paramTypes),
            this.untypedparamTypes.concat(other.untypedparamTypes))
    }
}

export type Filter = ReaderWriter<FilterEnv, FilterResult, QbEmit>

export type Query = Top | Skip | Count | Expand | OrderBy | Select | Filter | Custom | Search

type QueryAccumulator = Writer<Dict<string>, QbEmit>

function maybeAdd(encode: boolean, s: QueryAccumulator, stateProp: string, inputProp: string | undefined,
    errorMessage = ""): QueryAccumulator {

    return s.map(state => {

        if (state[stateProp]) {
            throw new Error(`Multiple ${stateProp} clauses detected` + (errorMessage && `. ${errorMessage}`))
        }

        return inputProp ? {
            ...state,
            [stateProp]: encode
                ? encodeURIComponent(inputProp)
                : inputProp
        } : state
    })
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
                        "Combine multiple filters with the `$filter.and` or `$filter.or` utils"))
            }

            if (x.$$oDataQueryObjectType === "Expand") {
                return x
                    .$$expand(filterEnv)
                    .bind(applied => maybeAdd(encode, s, "$expand", applied,
                        "Combine multiple expansions with the `$expand.combine` util"));
            }

            if (x.$$oDataQueryObjectType === "OrderBy") {
                return x.$$orderBy.bind(x => maybeAdd(encode, s, "$orderBy", x));
            }

            if (x.$$oDataQueryObjectType === "Select") {
                return maybeAdd(encode, s, "$select", x.$$select);
            }

            if (x.$$oDataQueryObjectType === "Custom") {
                return maybeAdd(encode, s, x.$$key, x.$$value);
            }

            if (x.$$oDataQueryObjectType === "Search") {
                return maybeAdd(encode, s, "$search", x.$$search);
            }

            if (x.$$oDataQueryObjectType === "Top") {
                return maybeAdd(encode, s, "$top", x.$$top.toString());
            }

            if (x.$$oDataQueryObjectType === "Count") {
                return maybeAdd(encode, s, "$count", "true");
            }

            return maybeAdd(encode, s, "$skip", x.$$skip.toString());
        }, Writer.create<Dict<string>, QbEmit>({}, QbEmit.zero));
}

export function buildQuery(serializerSettings: SerializerSettings, buildUri: BuildUri,
    qbEmit: QbEmit, q: Query | Query[], filterEnv: FilterEnv, encode: boolean): Dict<string> {

    const pq = buildPartialQuery(q, filterEnv, encode)
        .bind(x => Writer.create(x, qbEmit))

    return merge(serializerSettings, buildUri, pq, encode)
}

const stringT = resolveOutputType(NonNumericTypes.String)

function processAtParams(qbEmit: QbEmit, encode: boolean, buildUri: BuildUri, serializerSettings: SerializerSettings) {

    const params = qbEmit.untypedparamTypes
        .map(x => [x, null] as [AtParam, ODataTypeRef | null])
        .concat(qbEmit.paramTypes)

    return _processAtParams(params, encode, buildUri, serializerSettings)
}

function constParamType(param: AtParam) {
    return (param.param.type === "Const"
        && param.param.data.paramType) || null
}

function _processAtParams(
    atParams: [AtParam, ODataTypeRef | null][],
    encode: boolean,
    buildUri: BuildUri,
    serializerSettings: SerializerSettings) {

    const stringify = encode
        ? (x: any) => encodeURIComponent(JSON.stringify(x))
        : (x: any) => JSON.stringify(x)

    const _serialize: typeof serialize = encode
        ? (x, y, z) => serialize(x, y, { ...z, allowJsonForComplexTypes: true }).map(encodeURIComponent)
        : (x, y, z) => serialize(x, y, { ...z, allowJsonForComplexTypes: true })

    const grouped = groupBy(atParams, x => x[0].name)
    return Object
        .keys(grouped)
        .flatMap((name): { k: string, v: string }[] => {
            const defs = removeNulls(grouped[name]
                .map(([param, t]) => param.param.type !== "Param"
                    ? { name: param.name, param: param.param, type: t }
                    : null))

            if (!defs.length) {
                throw new Error(`Param ${name} is referenced but not defined`)
            }

            if (defs.length > 1
                && defs.reduce((s, x) => s || x.param !== defs[0].param, false)) {
                throw new Error(`Param ${name} is defined more than once`)
            }

            const def = defs[0]
            const t = defs.map(x => x.type)[0]

            if (def.param.type === "Const") {
                return [{
                    k: def.name,
                    v: constParamType(def) || t
                        ? _serialize(def.param.data.value, constParamType(def) || t, serializerSettings).execute()[0]
                        : typeof def.param.data.value === "string"
                            ? _serialize(def.param.data.value, stringT, serializerSettings).execute()[0]
                            : stringify(def.param.data.value)
                }]
            }

            if (def.param.type === "Ref") {

                const [uriParts, emit] = extractAtParams(
                    def.param.data.uri.uri(false)).execute()

                return [{
                    k: def.param.data.name,
                    v: def.param.data.serializeAsObject
                        ? stringify({ "@odata.id": buildUri(uriParts) })
                        : _serialize(buildUri(uriParts), rawType, serializerSettings).execute()[0]
                }].concat(processAtParams(emit, encode, buildUri, serializerSettings))
            }

            const collectionType = (t && t.isCollection && t.collectionType) || null
            const innerParams = def.param.data.values
                // process each param separately so as to ignore duplicate names
                .flatMap(x => _processAtParams(
                    [[x, constParamType(x) || collectionType]],
                    false,
                    buildUri,
                    serializerSettings))
                .map(x => x.v)

            const ps = `[${innerParams.join(",")}]`

            return [{
                k: def.name,
                v: encode ? encodeURIComponent(ps) : ps
            }]
        })

}

function merge(serializerSettings: SerializerSettings, buildUri: BuildUri,
    acc: QueryAccumulator, encode: boolean): Dict<string> {
    const [params, _dataParams] = acc.execute()

    return processAtParams(_dataParams, encode, buildUri, serializerSettings)
        .reduce((s, x) => {
            const k = encode ? encodeURIComponent(x.k) : x.k
            if (s[k]) {
                throw new Error(`Param ${x.k} is defined more than once`)
            }

            return {
                ...s,
                [k]: x.v
            };
        }, params)
}
