import { ODataServiceConfig, ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";
import { ODataUriParts } from "./entitySet/requestTools.js";
import { Reader } from "./utils.js";

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

export type Expand = {
    $$oDataQueryObjectType: "Expand"
    $$expand: (env: FilterEnv) => string
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

export type FilterEnv = {
    buildUri: (uriParts: ODataUriParts) => string,
    serviceConfig: ODataServiceConfig
    rootContext: string
}

export type Filter = Reader<FilterEnv, FilterResult>

export type Query = Top | Skip | Count | Expand | OrderBy | Select | Filter | Custom | Search

function maybeAdd(encode: boolean, s: Dict<string>, stateProp: string, inputProp: string | undefined, errorMessage: string) {

    if (s[stateProp]) {
        throw new Error(errorMessage);
    }

    return inputProp !== undefined
        ? {
            ...s,
            [stateProp]: encode
                ? encodeURIComponent(inputProp)
                : inputProp
        }
        : s
}

export function buildQuery(q: Query | Query[], filterEnv: FilterEnv, encode = true): Dict<string> {
    if (!Array.isArray(q)) {
        return buildQuery([q], filterEnv, encode)
    }

    return q
        .reduce((s, x) => {

            if (x instanceof Reader) {
                return maybeAdd(encode, s, "$filter", x.apply(filterEnv).$$filter,
                    "Multiple expansions detected. Combine multipe expansions with the $filter.and or $filter.or utils");
            }

            if (x.$$oDataQueryObjectType === "Expand") {
                return maybeAdd(encode, s, "$expand", x.$$expand(filterEnv),
                    "Multiple expansions detected. Combine multipe expansions with the $expand.combine util");
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
        }, {} as Dict<string>);
}
