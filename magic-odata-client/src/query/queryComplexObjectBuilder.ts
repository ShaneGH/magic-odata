import { ODataComplexType, ODataTypeRef, ODataServiceTypes, ODataEnum } from "magic-odata-shared";
import { typeNameString, typeRefString } from "../utils.js";

type Dict<T> = { [key: string]: T }

export enum QueryObjectType {
    QueryObject = "QueryObject",
    QueryCollection = "QueryCollection",
    QueryPrimitive = "QueryPrimitive",
    QueryEnum = "QueryEnum"
}

export type PathSegment = {
    path: string
    navigationProperty: boolean
}

export type MutableQueryObjectMetadata = {
    usedAliases: Dict<boolean>
}

export type QueryObjectMetadata = {
    rootContext: string
    typeRef: ODataTypeRef
    path: PathSegment[]
    queryAliases: Dict<boolean>
}

// T is not used, but adds strong typing to FilterUtils
export type QueryPrimitive<T> = {
    $$oDataQueryObjectType: QueryObjectType.QueryPrimitive
    $$oDataQueryMetadata: QueryObjectMetadata
}

// T is not used, but adds strong typing to FilterUtils
export type QueryEnum<T> = {
    $$oDataQueryObjectType: QueryObjectType.QueryEnum
    $$oDataQueryMetadata: QueryObjectMetadata
    $$oDataEnumType: ODataEnum
}

// type def is recursive for this type: "TQueryObj extends QueryObject<...". Cannot be a "type"
export interface QueryCollection<TQueryObj extends QueryObject<TArrayType>, TArrayType> {
    $count: QueryPrimitive<number>
    $$oDataQueryObjectType: QueryObjectType.QueryCollection
    $$oDataQueryMetadata: QueryObjectMetadata
    childObjConfig: TQueryObj
    childObjAlias: string
}

export type QueryComplexObjectBase = {
    $$oDataQueryObjectType: QueryObjectType.QueryObject
    $$oDataQueryMetadata: QueryObjectMetadata
}

export type HasODataQueryMetadata = {
    $$oDataQueryMetadata: QueryObjectMetadata
}

export type QueryComplexObject<T> = T & QueryComplexObjectBase

export type QueryObject<T> = QueryPrimitive<T> | QueryCollection<QueryObject<T>, T> | QueryComplexObject<T> | QueryEnum<T>

function buildAlias(forName: string) {

    const parts = [];

    // create acronym from camelCase, PascalCase and 
    // snake_case or a combination of all 3
    const rx = /(^[a-zA-Z])|([A-Z])|((?<=_)[a-z])/g;
    let result: RegExpExecArray | null;
    while (parts.length < 5 && (result = rx.exec(forName || ""))) {
        parts.push(result[0]);
    }

    return parts.length
        ? parts.join("").toLowerCase()
        : "x";
}

function addAlias(aliasFor: string, aliases: Dict<boolean>) {

    const aliasCandidate = buildAlias(aliasFor);
    let newAlias = aliasCandidate;
    for (let i = 1; aliases[newAlias]; i++) {
        newAlias = `${aliasCandidate}${i}`;
    }

    return {
        newAlias,
        aliases: {
            ...aliases,
            [newAlias]: true
        }
    };
}

function buildArrayCount(arrayMetadata: QueryObjectMetadata): QueryPrimitive<number> {
    return {
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            rootContext: arrayMetadata.rootContext,
            typeRef: { name: "Int32", namespace: "Edm", isCollection: false },
            path: [...arrayMetadata.path, { navigationProperty: false, path: "$count" }],
            queryAliases: arrayMetadata.queryAliases
        }
    };
}

function buildPropertyTypeRef<T>(type: ODataTypeRef, root: ODataServiceTypes, rootContext: string, path: PathSegment[], queryAliases: Dict<boolean>): QueryObject<T> {

    if (type.isCollection) {
        if (!path.length) {
            throw new Error("The top level object cannot be a collection");
        }

        const newAliases = addAlias(path[path.length - 1].path, queryAliases);
        const $$oDataQueryMetadata = {
            path,
            rootContext,
            typeRef: type,
            queryAliases: newAliases.aliases
        }

        return {
            $count: buildArrayCount($$oDataQueryMetadata),
            $$oDataQueryObjectType: QueryObjectType.QueryCollection,
            $$oDataQueryMetadata,
            childObjConfig: buildPropertyTypeRef<T>(type.collectionType, root, newAliases.newAlias, [], newAliases.aliases),
            childObjAlias: newAliases.newAlias
        };
    }

    if (type.namespace === "Edm") {
        return {
            $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
            $$oDataQueryMetadata: {
                path,
                rootContext,
                typeRef: type,
                queryAliases
            }
        };
    }

    const tLookup = root[type.namespace || ""] && root[type.namespace || ""][type.name];
    if (!tLookup) {
        throw new Error(`Could not find type ${typeNameString(type)}`);
    }

    if (tLookup.containerType === "Enum") {
        return {
            $$oDataEnumType: tLookup.type,
            $$oDataQueryObjectType: QueryObjectType.QueryEnum,
            $$oDataQueryMetadata: {
                rootContext,
                path,
                typeRef: type,
                queryAliases
            }
        };
    }

    const complexType = tLookup.type
    const base: QueryComplexObjectBase = {
        $$oDataQueryObjectType: QueryObjectType.QueryObject,
        $$oDataQueryMetadata: {
            rootContext,
            path,
            typeRef: type,
            queryAliases
        }
    }

    const bLookup = complexType.baseType
        && root[complexType.baseType.namespace]
        && root[complexType.baseType.namespace][complexType.baseType.name];

    if (complexType.baseType && !bLookup) {
        throw new Error(`Could not find base type ${typeNameString(complexType.baseType)}`);
    }

    if (bLookup && bLookup.containerType !== "ComplexType") {
        throw new Error(`Base type ${typeNameString(bLookup.type)} is an enum. Expecting a complex type`);
    }

    // This is a bit hacky. 
    //   1. I can't get the type system to behave correctly here (Mixin between regular obj and dictionary)
    //   2. Spread won't work on getters. Need to mutate objects
    const baseType = bLookup?.type;
    return Object
        .keys(baseType?.properties || {})
        .map(key => ({ key, value: baseType!.properties[key] }))
        .concat(Object
            .keys(complexType.properties)
            .map(key => ({ key, value: complexType.properties[key] })))
        .reduce((s, x) => {
            if (x.key === "$$oDataQueryObjectType" || x.key === "$$oDataQueryMetadata") {
                throw new Error(`Property ${x.key} is reserved`);
            }

            let propertyCache: any = null;
            Object.defineProperty(
                s,
                x.key,
                {
                    get() {
                        if (propertyCache !== null) {
                            return propertyCache;
                        }

                        const propPath = [
                            ...path,
                            {
                                path: x.key,
                                navigationProperty: x.value.navigationProperty
                            }];

                        return propertyCache = buildPropertyTypeRef(x.value.type, root, rootContext, propPath, queryAliases);
                    }
                });

            return s;
        }, base) as QueryComplexObject<T>;
}

export function buildComplexTypeRef<T>(type: ODataComplexType, root: ODataServiceTypes,
    rootContext: string): QueryComplexObject<T> {

    const typeRef = buildPropertyTypeRef<T>({
        name: type.name,
        namespace: type.namespace,
        isCollection: false
    }, root, rootContext, [], {});

    if (typeRef.$$oDataQueryObjectType !== QueryObjectType.QueryObject) {
        throw new Error(`Type ref is not a complex object: ${typeRef.$$oDataQueryObjectType}, ${typeRefString(typeRef.$$oDataQueryMetadata.typeRef)}`);
    }

    return typeRef;
}

export function reContext<T>(obj: QueryComplexObject<T>, root: ODataServiceTypes): QueryComplexObject<T> {

    if (obj.$$oDataQueryMetadata.typeRef.isCollection) {
        throw new Error("Complex object has collection type ref");
    }

    // can't just use spread operator here as it will not copy
    // over getters
    const typeRef = buildPropertyTypeRef<T>({
        name: obj.$$oDataQueryMetadata.typeRef.name,
        namespace: obj.$$oDataQueryMetadata.typeRef.namespace,
        isCollection: false
    }, root, "$this", [], obj.$$oDataQueryMetadata.queryAliases);

    if (typeRef.$$oDataQueryObjectType !== QueryObjectType.QueryObject) {
        throw new Error(`Type ref is not a complex object: ${typeRef.$$oDataQueryObjectType}, ${typeRefString(typeRef.$$oDataQueryMetadata.typeRef)}`);
    }

    return typeRef;
}