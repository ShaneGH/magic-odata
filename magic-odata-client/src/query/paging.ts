import { Top, Skip, Count } from "../queryBuilder.js"

/**
 * Add a $top paging parameter to the query
 */
export function top(top: number): Top {

    return {
        $$oDataQueryObjectType: "Top",
        $$top: top
    }
}

/**
 * Add a $skip paging parameter to the query
 */
export function skip(skip: number): Skip {

    return {
        $$oDataQueryObjectType: "Skip",
        $$skip: skip
    }
}

/**
 * Add a $count parameter to the query
 */
export function count(): Count {

    return {
        $$oDataQueryObjectType: "Count"
    }
}