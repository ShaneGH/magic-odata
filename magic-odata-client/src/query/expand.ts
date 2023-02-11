import { Expand, Query } from "../queryBuilder.js"
import { PathSegment, QueryCollection, QueryComplexObject, QueryObjectType, reContext } from "./queryComplexObjectBuilder.js"

export type ExpandUtils = {

    /**
     * Add a custom expand string
     * 
     * @example expandRaw("property1")
     */
    expandRaw(expand: string): Expand

    /**
     * Expand an object or array of objects. 
     * 
     * @param obj An object to expand. 
     * Entities can be deeply expanded by inputting nested properties. 
     * Entities in a collection will need to use the second arg of this method for deep expansion
     * 
     * @param and A list of further expansions, transforms and filters to apply
     * 
     * @example expand(my.user)
     * @example expand(my.user.blogPosts)
     * @example expand(my.user.blogPosts, p => [ gt(p.likes, 10), select(p.title), $count() ])
     */
    expand<T>(obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand;

    /**
     * Combine multiple expanded properties
     * 
     * @example combine(expand(my.property1), expand(my.property2))
     */
    combine(...expansions: Expand[]): Expand

    /**
     * Expand all properties of an object
     * 
     * @param $ref If true, expand by ref. Default false
     */
    expandAll($ref?: boolean): Expand
}

function expandRaw(expand: string): Expand {

    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: expand
    }
}

function expandAll($ref?: boolean): Expand {
    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: $ref ? "*/$ref" : "*"
    }
}

function expand<T>(obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand {

    const $$expand = _expand(obj.$$oDataQueryMetadata.path);
    if (!$$expand) {
        throw new Error("Object cannot be expanded");
    }

    if (!and) {
        return {
            $$oDataQueryObjectType: "Expand",
            $$expand
        }
    }

    const reContexted = obj.$$oDataQueryObjectType === QueryObjectType.QueryCollection
        ? reContext(obj.childObjConfig)
        : reContext(obj);

    const innerQ = and(reContexted);
    const inner = Array.isArray(innerQ)
        ? innerQ.map(queryToString).join(";")
        : queryToString(innerQ);

    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: `${$$expand}(${inner})`
    }
}

function queryToString(result: Query) {

    if (result.$$oDataQueryObjectType === "Expand") {
        return `$expand=${result.$$expand}`
    }

    if (result.$$oDataQueryObjectType === "Filter") {
        return `$filter=${result.$$filter}`
    }

    if (result.$$oDataQueryObjectType === "OrderBy") {
        return `$orderBy=${result.$$orderBy}`
    }

    if (result.$$oDataQueryObjectType === "Search") {
        return `$search=${result.$$search}`
    }

    if (result.$$oDataQueryObjectType === "Custom") {
        return `${result.$$key}=${result.$$value}`
    }

    if (result.$$oDataQueryObjectType === "Count") {
        return `$count=true`
    }

    if (result.$$oDataQueryObjectType === "Top") {
        return `$top=${result.$$top}`
    }

    if (result.$$oDataQueryObjectType === "Skip") {
        return `$skip=${result.$$skip}`
    }

    return `$select=${result.$$select}`;
}

function _expand(pathSegment: PathSegment[]): string | null {
    if (!pathSegment.length) return null

    const head = pathSegment[0].path;
    const tail = pathSegment.slice(1);
    const next = _expand(tail);
    if (next == undefined) {
        return head;
    }

    return tail[0].navigationProperty
        ? `${head}($expand=${next})`
        : `${head}/${next}`;
}

function combine(...expansions: Expand[]): Expand {
    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: expansions.map(x => x.$$expand).join(",")
    }
}

export function newUtils(): ExpandUtils {
    return {
        expand,
        combine,
        expandRaw,
        expandAll
    }
}