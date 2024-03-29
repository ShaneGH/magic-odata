import { FilterUtils, newUtils as filter } from "./filters.js";
import { SelectUtils, newUtils as select } from "./select.js";
import { ExpandUtils, newUtils as expand } from "./expand.js";
import { OrderingUtils, newUtils as orderBy } from "./orderBy.js";
import { SearchUtils, newUtils as search } from "./search.js";
import { count, top, skip } from "./paging.js";
import { Custom } from "../queryBuilder.js";
import { levels } from "./levels.js";

/**
 * Utils for building queries
 */
export type Utils<TRoot> = {
    /**
     * Utils for $filter operations
     * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_BuiltinQueryFunctions
     */
    $filter: FilterUtils<TRoot>

    /**
     * Utils for $select operations
     */
    $select: SelectUtils

    /**
     * Utils for $expand operations
     */
    $expand: ExpandUtils

    /**
     * Utils for $orderby operations
     */
    $orderby: OrderingUtils

    /**
     * Utils for $search operations
     */
    $search: SearchUtils

    /**
     * A $top operation
     */
    $top: typeof top

    /**
     * A $skip operation
     */
    $skip: typeof skip

    /**
     * A $count operation
     */
    $count: typeof count

    /**
     * Add a custom query param
     * @param paramName The name. If this param is added at the root query level, it's value will not be url encoded. Otherwise it will
     * @param value The value
     * @example custom("$filter", "name eq 'John'")
     */
    custom: typeof custom

    /**
     * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ExpandOptionlevels
     */
    $levels: typeof levels
}

export function utils<TRoot>(): Utils<TRoot> {
    return {
        $filter: filter<TRoot>(),
        $select: select(),
        $expand: expand(),
        $orderby: orderBy(),
        $search: search(),
        $top: top,
        $skip: skip,
        $count: count,
        custom,
        $levels: levels
    }
}

export function custom(paramName: string, value: string): Custom {
    return {
        $$oDataQueryObjectType: "Custom",
        $$key: paramName,
        $$value: value
    }

}