import { Select } from "../queryBuilder.js"
import { QueryObject } from "./queryComplexObjectBuilder.js"

export type SelectUtils = {
    /**
     * Select a list of properties
     * NOTE: if you enter a navigation property here, you may get back some unexpected results
     * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionselect
     * @param props The properties to select
     * @example select(my.property1, my.property2)
     */
    select(...props: QueryObject<any>[]): Select

    /**
     * Add a custom select statement
     * @example selectRaw("property1,property2")
     */
    selectRaw(customSelect: string): Select
}

function getPath<T>(x: QueryObject<T>) {
    return x.$$oDataQueryMetadata.path.length
        ? x.$$oDataQueryMetadata.path.map(p => p.path).join("/")
        : x.$$oDataQueryMetadata.rootContext
}

function select(...props: QueryObject<any>[]): Select {
    /* istanbul ignore next */
    if (!props?.length) {
        throw new Error("You must specify at least one property to select");
    }

    return {
        $$oDataQueryObjectType: "Select",
        $$select: props.map(getPath).join(",")
    }
}

function selectRaw(customSelect: string): Select {

    return {
        $$oDataQueryObjectType: "Select",
        $$select: customSelect
    }
}

export function newUtils(): SelectUtils {
    return {
        select,
        selectRaw
    }
}