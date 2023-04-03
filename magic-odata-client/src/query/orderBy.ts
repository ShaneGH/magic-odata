import { SubPathSelection, isSubPathSelection } from "../entitySet/subPath.js"
import { Param } from "../entitySetInterfaces.js"
import { OrderBy, QbEmit } from "../queryBuilder.js"
import { Writer } from "../utils.js"
import { AtParam } from "../valueSerializer.js"
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
    return _orderByRaw(Writer.create(orderByString, QbEmit.zero))
}

function _orderByRaw(orderBy: Writer<string, QbEmit>): OrderBy {
    return {
        $$oDataQueryObjectType: "OrderBy",
        $$orderBy: orderBy
    }
}

type OrderByProperty =
    | QueryPrimitive<any>
    | QueryEnum<any>
    | SubPathSelection<any>
    | Param<any>

type Property = OrderByProperty | [OrderByProperty, "asc" | "desc"]

function isParam<T>(x: T): x is Param<any> {
    return x instanceof AtParam
}

function processParam<T>(x: Param<T>): [string, QbEmit] {
    return [x.param.data.name, x instanceof AtParam ? QbEmit.maybeZero(undefined, [x]) : QbEmit.zero]
}

function processObjReference(x: QueryPrimitive<any> | QueryEnum<any>): [string, QbEmit] {
    const str = x.$$oDataQueryMetadata.path.map((x: any) => x.path).join("/")
        || x.$$oDataQueryMetadata.rootContext

    return [str, x.$$oDataQueryMetadata.qbEmit]
}

function orderBy(...properties: Property[]): OrderBy {

    if (!properties.length) {
        throw new Error("You must order by at least one property");
    }

    const $$orderBy = Writer
        .traverse(properties
            .map(x => {
                let direction = ""
                if (Array.isArray(x)) {
                    direction = ` ${x[1]}`
                    x = x[0]
                }

                let order: [string, QbEmit] = isSubPathSelection(x)
                    // not sure this condition is ever hit. The subpath selections (in type) are obj references in data
                    ? [x.propertyName, x.qbEmit]
                    : isParam(x)
                        ? processParam(x)
                        : processObjReference(x)

                order = (direction && [`${order[0]}${direction}`, order[1]]) || order

                return Writer.create<string, QbEmit>(...order)
            }), QbEmit.zero)
        .map(x => x.join(","))

    return _orderByRaw($$orderBy)
}

export function newUtils(): OrderingUtils {
    return {
        orderBy,
        orderByRaw
    }
}