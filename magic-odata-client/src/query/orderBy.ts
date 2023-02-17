import { OrderBy } from "../queryBuilder.js"
import { QueryEnum, QueryPrimitive } from "./queryComplexObjectBuilder.js"

export type OrderingUtils = {

    /**
     * Add a custom expand string
     * @example orderByRaw("property1 asc")
     */
    orderByRaw(orderByString: string): OrderBy

    /**
     * Order results. Use an array to group properties with their direction if necessary
     * @example expand(my.prop1, [my.prop2, "desc"], my.collection.$count)
     */
    orderBy(...properties: Property[]): OrderBy
}

function orderByRaw(orderByString: string): OrderBy {
    return {
        $$oDataQueryObjectType: "OrderBy",
        $$orderBy: orderByString
    }
}

type Property = QueryPrimitive<any> | QueryEnum<any> | [QueryPrimitive<any> | QueryEnum<any>, "asc" | "desc"]

function orderBy(...properties: Property[]): OrderBy {

    if (!properties.length) {
        throw new Error("You must order by at least one property");
    }

    const $$orderBy = properties
        .map(x => {
            if (!Array.isArray(x)) {
                x = [x, "asc"]
            }

            return `${x[0].$$oDataQueryMetadata.path.map(x => x.path).join("/")} ${x[1]}`
        })
        .join(",")

    return orderByRaw($$orderBy)
}

export function newUtils(): OrderingUtils {
    return {
        orderBy,
        orderByRaw
    }
}