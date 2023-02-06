import { Paging } from "../queryBuilder.js"

/**
 * Add paging and a count to the query
 */
export function paging(top: number | undefined | null, skip?: number | undefined | null, count?: boolean | undefined | null): Paging {

    return {
        $$oDataQueryObjectType: "Paging",
        $$top: top === null ? undefined : top,
        $$skip: skip === null ? undefined : skip,
        $$count: count === null ? undefined : count
    }
}

/**
 * Add a count to the query
 */
export function count(): Paging {

    return paging(null, null, true)
}