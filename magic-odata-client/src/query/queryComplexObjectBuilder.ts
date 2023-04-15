import { ODataComplexType, ODataTypeRef, ODataEnum, ODataComplexTypeProperty, Function as ODataFunction } from "magic-odata-shared";
import { functionUriBuilder } from "../entitySet/subPath.js";
import { Filter, QbEmit } from "../queryBuilder.js";
import { groupBy, typeNameString, typeRefString } from "../utils.js";
import { SerializerSettings, rawType } from "../valueSerializer.js";
import { eq, ge, gt, isIn, le, lt, ne } from "./filtering/logical2.js";
import { OperableCollection } from "./filtering/collection1.js";
import { Operable } from "./filtering/operable0.js";

type Dict<T> = { [key: string]: T }

export type Comparable<T> = {
    /** 
     * Fluent version of eq filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    eq(other: T | Operable<T>): Filter

    /** 
     * Fluent version of ne filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    ne(other: T | Operable<T>): Filter

    /** 
     * Fluent version of gt filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    gt(other: T | Operable<T>): Filter

    /** 
     * Fluent version of lt filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    lt(other: T | Operable<T>): Filter

    /** 
     * Fluent version of ge filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    ge(other: T | Operable<T>): Filter

    /** 
     * Fluent version of le filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    le(other: T | Operable<T>): Filter

    /** 
     * Fluent version of isIn filter. 
     * See https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts for details 
     */
    isIn(other: T[] | OperableCollection<T>): Filter
}

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
    qbEmit: QbEmit
}

// T is not used, but adds strong typing to FilterUtils
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type QueryPrimitiveMeta<T> = {
    $$oDataQueryObjectType: QueryObjectType.QueryPrimitive
    $$oDataQueryMetadata: QueryObjectMetadata
}

export type QueryPrimitive<T> = QueryPrimitiveMeta<T> & Comparable<T>

// T is not used, but adds strong typing to FilterUtils
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type QueryEnumMeta<T> = {
    $$oDataQueryObjectType: QueryObjectType.QueryEnum
    $$oDataQueryMetadata: QueryObjectMetadata
    $$oDataEnumType: ODataEnum
}

export type QueryEnum<T> = QueryEnumMeta<T> & Comparable<T>

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

export function hasODataQueryMetadata(x: any): x is HasODataQueryMetadata {
    return typeof x.$$oDataQueryObjectType === "string"
        && typeof x.$$oDataQueryMetadata === "object"
}

export type QueryComplexObject<T> = T & QueryComplexObjectBase

export type QueryObject<T> = QueryPrimitive<T> | QueryCollection<QueryObject<T>, T> | QueryComplexObject<T> | QueryEnum<T>

export function addEquality<T extends QueryPrimitiveMeta<U> | QueryEnumMeta<U>, U>(x: T): T & Comparable<U> {
    return {
        ...x,
        eq: function (x: U | Operable<U>) { return eq(this, x) },
        ne: function (x: U | Operable<U>) { return ne(this, x) },
        gt: function (x: U | Operable<U>) { return gt(this, x) },
        lt: function (x: U | Operable<U>) { return lt(this, x) },
        ge: function (x: U | Operable<U>) { return ge(this, x) },
        le: function (x: U | Operable<U>) { return le(this, x) },
        isIn: function (xs: U[] | OperableCollection<U>) { return isIn(this, xs) }
    }
}

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
    return addEquality({
        $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
        $$oDataQueryMetadata: {
            rootContext: arrayMetadata.rootContext,
            typeRef: { name: "Int32", namespace: "Edm", isCollection: false },
            path: [...arrayMetadata.path, { navigationProperty: false, path: "$count" }],
            queryAliases: arrayMetadata.queryAliases,
            qbEmit: arrayMetadata.qbEmit
        }
    });
}

function buildPropertyTypeRef<T>(type: ODataTypeRef, serializerSettings: SerializerSettings,
    rootContext: string, path: PathSegment[], queryAliases: Dict<boolean>, qbEmit: QbEmit): QueryObject<T> {

    if (type.isCollection) {
        /* istanbul ignore next */
        if (!path.length) {
            throw new Error("The top level object cannot be a collection");
        }

        const newAliases = addAlias(path[path.length - 1].path, queryAliases);
        const $$oDataQueryMetadata = {
            path,
            rootContext,
            typeRef: type,
            queryAliases: newAliases.aliases,
            qbEmit
        }

        return {
            $count: buildArrayCount($$oDataQueryMetadata),
            $$oDataQueryObjectType: QueryObjectType.QueryCollection,
            $$oDataQueryMetadata,
            childObjConfig: buildPropertyTypeRef<T>(type.collectionType, serializerSettings, newAliases.newAlias, [], newAliases.aliases, QbEmit.zero),
            childObjAlias: newAliases.newAlias
        };
    }

    if (type.namespace === "Edm") {
        return addEquality({
            $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
            $$oDataQueryMetadata: {
                path,
                rootContext,
                typeRef: type,
                queryAliases,
                qbEmit
            }
        });
    }

    const root = serializerSettings.serviceConfig
    const tLookup = root[type.namespace || ""] && root[type.namespace || ""].types[type.name];

    /* istanbul ignore next */
    if (!tLookup) {
        throw new Error(`Could not find type ${typeNameString(type)}`);
    }

    if (tLookup.containerType === "Enum") {
        return addEquality({
            $$oDataEnumType: tLookup.type,
            $$oDataQueryObjectType: QueryObjectType.QueryEnum,
            $$oDataQueryMetadata: {
                rootContext,
                path,
                typeRef: type,
                queryAliases,
                qbEmit
            }
        });
    }

    const complexType = tLookup.type
    const base: QueryComplexObjectBase = {
        $$oDataQueryObjectType: QueryObjectType.QueryObject,
        $$oDataQueryMetadata: {
            rootContext,
            path,
            typeRef: type,
            queryAliases,
            qbEmit
        }
    }

    const bLookup = complexType.baseType
        && root[complexType.baseType.namespace]
        && root[complexType.baseType.namespace].types[complexType.baseType.name];

    /* istanbul ignore next */
    if (complexType.baseType && !bLookup) {
        throw new Error(`Could not find base type ${typeNameString(complexType.baseType)}`);
    }

    /* istanbul ignore next */
    if (bLookup && bLookup.containerType !== "ComplexType") {
        throw new Error(`Base type ${typeNameString(bLookup.type)} is an enum. Expecting a complex type`);
    }

    // This is a bit hacky. 
    //   1. I can't get the type system to behave correctly here (Mixin between regular obj and dictionary)
    //   2. Spread won't work on getters. Need to mutate objects
    const baseType = bLookup?.type;

    // order is important
    return properties()
        .concat(functions())
        .concat(baseTypeProperties())
        .concat(baseTypeFunctions())
        .reduce((s, x) => {
            /* istanbul ignore next */
            if (x.key === "$$oDataQueryObjectType" || x.key === "$$oDataQueryMetadata") {
                throw new Error(`Property ${x.key} is reserved`);
            }

            if ((s as any)[x.key]) return s

            let propertyCache: any = null;
            Object.defineProperty(
                s,
                x.key,
                {
                    get() {

                        if (propertyCache !== null) {
                            return propertyCache;
                        }

                        if (x.type === "Function") {
                            const fs = functionUriBuilder(x.key, serializerSettings, x.functionGroup)
                            return propertyCache = function (args: any) {
                                const { propertyName, outputType, qbEmit } = fs(args)
                                const propPath = [
                                    ...path,
                                    { path: propertyName, navigationProperty: false }
                                ];

                                return buildPropertyTypeRef(outputType || rawType, serializerSettings, rootContext, propPath, queryAliases, s.$$oDataQueryMetadata.qbEmit.concat(qbEmit))
                            }
                        }

                        const propPath = [
                            ...path,
                            {
                                path: x.key,
                                navigationProperty: x.value.navigationProperty
                            }];

                        return propertyCache = buildPropertyTypeRef(x.value.type, serializerSettings, rootContext, propPath, queryAliases, s.$$oDataQueryMetadata.qbEmit);
                    }
                });

            return s;
        }, base) as QueryComplexObject<T>;

    function baseTypeFunctions(): PropertyOrMethod[] {
        const grouped = groupBy(complexType.functions, x => x.name);
        return Object
            .keys(grouped)
            .map(key => ({
                type: "Function",
                key,
                functionGroup: grouped[key]
            }))
    }

    function baseTypeProperties(): PropertyOrMethod[] {

        return Object
            .keys(baseType?.properties || {})
            .map(key => ({ type: "Property", key, value: baseType!.properties[key] }))
    }

    function functions(): PropertyOrMethod[] {
        const grouped = groupBy(complexType.functions, x => x.name);
        return Object
            .keys(grouped)
            .map(key => ({
                type: "Function",
                key,
                functionGroup: grouped[key]
            }))
    }

    function properties(): PropertyOrMethod[] {
        return Object
            .keys(complexType.properties)
            .map(key => ({ type: "Property", key, value: complexType.properties[key] }))
    }
}

type PropertyOrMethod =
    | { type: "Property", key: string, value: ODataComplexTypeProperty }
    | { type: "Function", key: string, functionGroup: ODataFunction[] }

export function buildComplexTypeRef<T>(type: ODataComplexType, serializerSettings: SerializerSettings,
    rootContext: string): QueryComplexObject<T> {

    const typeRef = buildPropertyTypeRef<T>({
        name: type.name,
        namespace: type.namespace,
        isCollection: false
    }, serializerSettings, rootContext, [], {}, QbEmit.zero);

    /* istanbul ignore next */
    if (typeRef.$$oDataQueryObjectType !== QueryObjectType.QueryObject) {
        throw new Error(`Type ref is not a complex object: ${typeRef.$$oDataQueryObjectType}, ${typeRefString(typeRef.$$oDataQueryMetadata.typeRef)}`);
    }

    return typeRef;
}

export function reContext<T>(obj: QueryComplexObject<T>, serializerSettings: SerializerSettings): QueryComplexObject<T> {

    /* istanbul ignore next */
    if (obj.$$oDataQueryMetadata.typeRef.isCollection) {
        throw new Error("Complex object has collection type ref");
    }

    // can't just use spread operator here as it will not copy
    // over getters
    const typeRef = buildPropertyTypeRef<T>({
        name: obj.$$oDataQueryMetadata.typeRef.name,
        namespace: obj.$$oDataQueryMetadata.typeRef.namespace,
        isCollection: false
    }, serializerSettings, "$this", [], obj.$$oDataQueryMetadata.queryAliases, obj.$$oDataQueryMetadata.qbEmit);

    /* istanbul ignore next */
    if (typeRef.$$oDataQueryObjectType !== QueryObjectType.QueryObject) {
        throw new Error(`Type ref is not a complex object: ${typeRef.$$oDataQueryObjectType}, ${typeRefString(typeRef.$$oDataQueryMetadata.typeRef)}`);
    }

    return typeRef;
}