import { buildPartialQuery, Expand, FilterEnv, QbEmit, Query } from "../queryBuilder.js"
import { Writer } from "../utils.js";
import { PathSegment, QueryCollection, QueryComplexObject, QueryObjectType, reContext } from "./queryComplexObjectBuilder.js"

export type ExpandUtils = {

    /**
     * Add a custom expand string
     * @example expandRaw("property1")
     */
    expandRaw(expand: string): Expand

    /**
     * Expand an object or array of objects. 
     * @param obj An object to expand. 
     * Entities can be deeply expanded by inputting nested properties. 
     * Entities in a collection will need to use the second arg of this method for deep expansion
     * @param and A list of further expansions, transforms and filters to apply
     * @example expand(my.user)
     * @example expand(my.user.blogPosts)
     * @example expand(my.user.blogPosts, p => [ gt(p.likes, 10), select(p.title), $count() ])
     */
    expand<T>(obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand;

    /**
     * Expand the count of array of objects. Equivelant of $expand=my/blogPosts/$count
     * @param obj An object to count. 
     * Entities can be deeply expanded by inputting nested properties. 
     * FIlter before counting by using the second arg of this method
     * @param and A list of further expansions, transforms and filters to apply
     * @example expandCount(my.blogPosts)
     * @example expandCount(my.blogPosts, p => gt(p.likes, 10))
     */
    expandCount<T>(obj: QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand;

    /**
     * Combine multiple expanded properties
     * @example combine(expand(my.property1), expand(my.property2))
     */
    combine(...expansions: Expand[]): Expand

    /**
     * Expand all properties of an object
     * $expand=*
     */
    expandAll(): Expand

    /**
     * Expand all properties of an object by $ref
     * $expand=* /$ref
     */
    expandRef($ref?: boolean): Expand
}

function expandRaw(expand: string): Expand {

    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: _ => Writer.create(expand, QbEmit.zero)
    }
}

function expandAll(): Expand {
    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: _ => Writer.create("*", QbEmit.zero)
    }
}

function expandRef(): Expand {
    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: _ => Writer.create("*/$ref", QbEmit.zero)
    }
}

function expand<T>(obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand {

    return _expand(obj, null, and);
}

function expandCount<T>(obj: QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand {

    return _expand(obj, "/$count", and);
}

function _expand<T>(
    obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>,
    addPath: string | null,
    and: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand {

    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: filterEnv => {
            const inner = (and && innerBit(filterEnv, obj, and)) || Writer.create(null as string | null, QbEmit.zero)
            return inner.map(inner => {

                const innerExpand = inner && addPath
                    ? `${addPath}(${inner})`
                    : inner
                        ? `(${inner})`
                        : addPath;

                const result = expandString(obj.$$oDataQueryMetadata.path, innerExpand);
                if (!result) {
                    throw new Error("Object cannot be expanded");
                }

                return result
            })
        }
    }
}

function innerBit<T>(
    filterEnv: FilterEnv,
    obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>,
    and: ((x: QueryComplexObject<T>) => Query | Query[])) {

    const reContexted = obj.$$oDataQueryObjectType === QueryObjectType.QueryCollection
        ? reContext(obj.childObjConfig, filterEnv.serviceConfig.schemaNamespaces)
        : reContext(obj, filterEnv.serviceConfig.schemaNamespaces);

    filterEnv = {
        ...filterEnv,
        rootContext: reContexted.$$oDataQueryMetadata.rootContext
    }

    return buildPartialQuery(and(reContexted), filterEnv, false)
        .map(innerQ => Object
            .keys(innerQ)
            .map(k => `${k}=${innerQ[k]}`)
            .join(";"));
}

function expandString(pathSegment: PathSegment[], addPath: string | null): string | null {
    if (!pathSegment.length) return null

    const head = pathSegment[0].path;
    const tail = pathSegment.slice(1);
    const next = expandString(tail, addPath);
    if (next == undefined) {
        return addPath ? `${head}${addPath}` : head;
    }

    return tail[0].navigationProperty
        ? `${head}($expand=${next})`
        : `${head}/${next}`;
}

function combine(...expansions: Expand[]): Expand {
    return {
        $$oDataQueryObjectType: "Expand",
        $$expand: env => Writer.traverse(expansions
            .map(x => x.$$expand(env)), QbEmit.zero)
            .map(x => x.join(","))
    }
}

export function newUtils(): ExpandUtils {
    return {
        expand,
        expandCount,
        combine,
        expandRaw,
        expandAll,
        expandRef
    }
}