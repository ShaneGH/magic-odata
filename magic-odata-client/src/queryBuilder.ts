import { ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";

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
    $$expand: string
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

export type Filter = {
    $$oDataQueryObjectType: "Filter"
    $$filter: string
    $$output?: ODataTypeRef
    $$root?: ODataServiceTypes
}

export type Query = Top | Skip | Count | Expand | OrderBy | Select | Filter | Custom | Search

function hasOwnProperty(s: Dict<string>, prop: string) {
    return Object.prototype.hasOwnProperty.call(s, prop)
}

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

export function buildQuery(q: Query | Query[], encode = true): Dict<string> {
    if (!Array.isArray(q)) {
        return buildQuery([q], encode)
    }

    return q
        .reduce((s, x) => {

            if (x.$$oDataQueryObjectType === "Expand") {
                return maybeAdd(encode, s, "$expand", x.$$expand,
                    "Multiple expansions detected. Combine multipe expansions with the expand.combine util");
            }

            if (x.$$oDataQueryObjectType === "Filter") {
                return maybeAdd(encode, s, "$filter", x.$$filter,
                    "Multiple filters detected. Combine multipe expansions with the filter.and or filter.or utils");
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
