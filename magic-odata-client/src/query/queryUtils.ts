import { FilterUtils, newUtils as filter } from "./filters.js";
import { SelectUtils, newUtils as select } from "./select.js";
import { ExpandUtils, newUtils as expand } from "./expand.js";
import { OrderingUtils, newUtils as orderBy } from "./orderBy.js";
import { SearchUtils, newUtils as search } from "./search.js";
import { count, paging } from "./paging.js";
import { Custom } from "../queryBuilder.js";

export type Utils = {
    filter: FilterUtils
    select: SelectUtils
    expand: ExpandUtils,
    orderBy: OrderingUtils
    search: SearchUtils
    paging: typeof paging
    count: typeof count
    custom: typeof custom
}

export function utils(): Utils {
    return {
        filter: filter(),
        select: select(),
        expand: expand(),
        orderBy: orderBy(),
        search: search(),
        paging,
        count,
        custom
    }
}

/**
 * Add a custom query param
 * 
 * @param paramName The name. If this param is added at the root query level, it's value will not be url encoded. Otherwise it will
 * 
 * @param value The value
 * 
 * @example custom("$filter", "name eq 'John'")
 */
export function custom(paramName: string, value: string): Custom {
    return {
        $$oDataQueryObjectType: "Custom",
        $$key: paramName,
        $$value: value
    }

}