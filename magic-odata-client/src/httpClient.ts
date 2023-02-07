import { ODataComplexType, ODataEntitySet, ODataTypeRef, ODataServiceConfig, ODataTypeName, ODataSingleTypeRef, ODataServiceTypes, ODataEnum } from "magic-odata-shared";
import { utils as queryUtils, Utils } from "./query/queryUtils.js";
import { buildQuery, Query } from "./queryBuilder.js";
import { ODataUriParts, RequestOptions, RequestTools, ResponseInterceptor, RootResponseInterceptor } from "./requestTools.js";
import { buildComplexTypeRef, QueryComplexObject, QueryEnum, QueryObjectType, QueryPrimitive } from "./typeRefBuilder.js";
import { typeNameString } from "./utils.js";
import { serialize } from "./valueSerializer.js";


export type ODataResultMetadata = Partial<{

    "@odata.context": string
}>

export type ODataCollectionResult<T> = ODataResultMetadata & {

    value: T
}

export type ODataResult<T> = ODataResultMetadata & T

export type Dictionary<T> = { [key: string]: T }

function addLeadingSlash(path: string) {
    return path && `/${path}`
}

function removeTrailingSlash(path: string) {
    return path && path.replace(/\/$/, "")
}

type Dict<T> = { [key: string]: T }

type EntityQueryState = {
    path: string[]
    query?: {
        query: Query | Query[]
        urlEncode: boolean
    }
}

export type KeySelection<TNewEntityQuery> = {
    keyEmbedType: WithKeyType,
    key: any
}

export type CastSelection<TNewEntityQuery> = {
    type: ODataTypeRef
}

export type SubPathSelection<TNewEntityQuery> = {
    propertyName: string
}

type LookupResult<TFlag extends string, T> = {
    flag: TFlag
    type: T
}

type LookupResults = LookupResult<"Complex", ODataComplexType> | LookupResult<"Primitive", ODataTypeName> | LookupResult<"Enum", ODataEnum>

function lookup(
    type: ODataTypeName,
    root: ODataServiceTypes): LookupResults {

    if (type.namespace === "Edm") {
        return { flag: "Primitive", type }
    }

    const result = root[type.namespace] && root[type.namespace][type.name];
    if (!result) {
        throw new Error(`Could not find type ${type.namespace && `${type.namespace}/`}${type.name}`)
    }

    return result.containerType === "ComplexType"
        ? { flag: "Complex", type: result.type }
        : { flag: "Enum", type: result.type };
}

function lookupComplex(
    type: ODataTypeName,
    root: ODataServiceTypes) {

    const result = lookup(type, root);
    if (result.flag !== "Complex") {
        throw new Error(`Could not find complex type ${typeNameString(type)}`)
    }

    return result.type;
}

function tryFindKeyNames(
    type: ODataTypeName,
    root: ODataServiceTypes): string[] {

    const t = lookupComplex(type, root);
    if (t.keyProps) return t.keyProps;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindKeyNames(parent, root)) || []
}

type KeyType = { name: string, type: ODataTypeRef }
function tryFindKeyTypes(
    type: ODataTypeName,
    root: ODataServiceTypes): KeyType[] {

    const t = lookupComplex(type, root);
    return tryFindKeyNames(t, root)
        .map(name => ({ name, type: findPropertyType(t, name, root) }));
}

function tryFindBaseType(
    type: ODataComplexType,
    root: ODataServiceTypes) {

    if (!type.baseType) {
        return null;
    }

    const result = root[type.baseType.namespace] && root[type.baseType.namespace][type.baseType.name]
    if (!result) {
        throw new Error(`Base type ${typeNameString(type)} does not exist`);
    }

    if (result.containerType !== "ComplexType") {
        throw new Error(`Base type ${typeNameString(type)} es an enum. Expected an entity or complex type`);
    }

    return result.type
}

function tryFindPropertyType(
    type: ODataTypeName,
    propertyName: string,
    root: ODataServiceTypes): ODataTypeRef | null {

    const t = lookupComplex(type, root);
    if (t.properties[propertyName]) return t.properties[propertyName].type;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindPropertyType(parent, propertyName, root)) || null;
}

function findPropertyType(
    type: ODataTypeName,
    propertyName: string,
    root: ODataServiceTypes): ODataTypeRef {

    const result = tryFindPropertyType(type, propertyName, root);
    if (!result) {
        throw new Error(`Could not find property ${propertyName} on type ${typeNameString(type)}`);
    }

    return result;
}

// might return duplicates if and child property names clash
function listAllProperties(
    type: ODataComplexType,
    root: ODataServiceTypes,
    includeParent = true): string[] {

    const parent = includeParent
        ? tryFindBaseType(type, root)
        : null;

    return Object
        .keys(type.properties)
        .concat(parent
            ? listAllProperties(parent, root, true)
            : []);
}

// unwraps an ODataTypeRef to 0 or 1 levels of collections or throws an error
function getDeepTypeRef(type: ODataTypeRef): { name: string, namespace: string, collectionDepth: number } {

    if (!type.isCollection) {
        return {
            name: type.name,
            namespace: type.namespace,
            collectionDepth: 0
        }
    }

    const inner = getDeepTypeRef(type.collectionType)
    return {
        ...inner,
        collectionDepth: inner.collectionDepth + 1
    }
}

// unwraps an ODataTypeRef to 0 or 1 levels of collections or throws an error
function getCastingTypeRef(type: ODataTypeRef) {

    const result = getDeepTypeRef(type);
    if (result.collectionDepth > 1) {
        throw new Error("Casting collections of collections is not yet supported");
    }

    return {
        namespace: result.namespace,
        name: result.name,
        isCollection: result.collectionDepth === 1
    }
}

/**
 * Specified how to format an entity key in a url
 */
export enum WithKeyType {
    /**
     * Specifies that a key should be embedded as a function call
     * e.g. ~/Users(1)
     * 
     * Default
     */
    FunctionCall = "FunctionCall",

    /**
     * Specifies that a key should be added as a path segment
     * e.g. ~/Users/1
     */
    PathSegment = "PathSegment"
}

const defaultRequestTools: Partial<RequestTools<any, any>> = {
    uriInterceptor: (uri: ODataUriParts) => {

        let queryPart = Object
            .keys(uri.query)
            .map(x => `${x}=${uri.query[x]}`)
            .join("&");

        const uriRoot = removeTrailingSlash(uri.uriRoot)
        const entityName = addLeadingSlash(removeTrailingSlash(uri.relativePath))
        queryPart = queryPart && `?${queryPart}`

        return `${uriRoot}${entityName}${queryPart}`
    },

    requestInterceptor: (_: any, x: RequestOptions) => x
}

function keyExpr(keyTypes: KeyType[], key: any, keyEmbedType: WithKeyType, serviceConfig: ODataServiceTypes) {

    if (key === undefined) key = null;

    if (keyTypes.length === 1) {
        const result = keyEmbedType === WithKeyType.FunctionCall
            ? { appendToLatest: true, value: `(${serialize(key, keyTypes[0].type, serviceConfig)})` }
            : keyEmbedType === WithKeyType.PathSegment
                ? { appendToLatest: false, value: `${serialize(key, keyTypes[0].type, serviceConfig)}` }
                : null;

        if (!result) {
            throw new Error(`Invalid WithKeyType: ${keyEmbedType}`);
        }

        return {
            ...result,
            value: encodeURIComponent(result.value)
        }
    }

    const kvp = keyTypes
        .map(t => Object.prototype.hasOwnProperty.call(key, t.name)
            ? { key: t.name, value: serialize(key[t.name], t.type, serviceConfig) }
            : t.name);

    const missingKeys = kvp.filter(x => typeof x === "string") as string[]

    if (missingKeys.length) {
        throw new Error(`Missing keys: ${missingKeys}`);
    }

    if (keyEmbedType !== WithKeyType.FunctionCall) {
        console.warn(`${keyEmbedType} key types are not supported for composite keys. Defaulting to ${WithKeyType.FunctionCall}`);
        keyEmbedType = WithKeyType.FunctionCall;
    }

    const value = (kvp as { key: string, value: string }[])
        .map(({ key, value }) => `${key}=${value}`)
        .join(",")

    return {
        appendToLatest: true,
        value: `(${encodeURIComponent(value)})`
    }
}

type ComplexQueryBuilder<TEntity> = (entity: QueryComplexObject<TEntity>, utils: Utils) => Query | Query[]
type PrimitiveQueryBuilder<TEntity> = (entity: QueryPrimitive<TEntity>, utils: Utils) => Query | Query[]
type EnumQueryBuilder<TEntity> = (entity: QueryEnum<TEntity>, utils: Utils) => Query | Query[]

export class HttpError extends Error {
    constructor(message: string, public httpResponse: any) {
        super(message)
    }
}

/**
 * Path and query utils on an entity set or sub path
 */
export interface IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult> {

    /**
     * Create a new EntitySet scoped to a single entity
     */
    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites casted to the specified type
     */
    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet of entites at the sub path defined
     */
    subPath<TNewEntityQuery>(
        subPath: (caster: TSubPath) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery;

    /**
     * Create a new EntitySet with the defined query attached
     * 
     * @param urlEncode Default true
     */
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean)
        : IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>;

    /**
     * Execute a get request
     * @param overrideRequestTools Override any request tools needed
     */
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;

    /**
     * Execute a get request, casting the result to something custom
     * @param overrideRequestTools Override any request tools needed
     */
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;

}

// TODO: deconstruct into different functions/files
// TODO: do not return instances from any methods. Return interfaces instead
export class EntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>
    implements IEntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult> {
    // ^^NOTE^^: these generic type names are copy pasted into code gen project \src\codeGen\utils.ts
    // ^^NOTE^^: make sure that they stay in sync

    private state: EntityQueryState

    constructor(
        private requestTools: RequestTools<TFetchResult, TResult>,
        private defaultResponseInterceptor: RootResponseInterceptor<TFetchResult, TResult>,
        private type: ODataTypeRef,
        private entitySet: ODataEntitySet,
        private root: ODataServiceConfig,
        state: EntityQueryState | undefined = undefined) {

        this.state = state || {
            path: [entitySet.name]
        };
    }

    withKey<TNewEntityQuery>(key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>): TNewEntityQuery {
        if (this.state.query) {
            throw new Error("You cannot add query components before doing a key lookup");
        }

        if (!this.state.path.length) {
            throw new Error("Invalid path");
        }

        if (!this.type.isCollection) {
            throw new Error("Cannot search for a single type by key. You must search a collection instead");
        }

        if (this.type.collectionType.isCollection) {
            throw new Error("Cannot search a collection of collections by key. You must search a collection instead");
        }

        const keyResult = key({
            key: (key: any, keyEmbedType?: WithKeyType.FunctionCall): KeySelection<any> => ({
                key, keyEmbedType: keyEmbedType || WithKeyType.FunctionCall
            })
        } as any);
        const keyTypes = tryFindKeyTypes(this.type.collectionType, this.root.types);
        const keyPath = keyExpr(keyTypes, keyResult.key, keyResult.keyEmbedType, this.root.types);

        const path = keyPath.appendToLatest
            ? [
                ...this.state.path.slice(0, this.state.path.length - 1),
                `${this.state.path[this.state.path.length - 1]}${keyPath.value}`
            ]
            : [
                ...this.state.path,
                keyPath.value
            ]

        return new EntitySet<any, any, any, any, any, any, any, any, any>(
            this.requestTools,
            this.defaultResponseInterceptor,
            this.type.collectionType,
            this.entitySet,
            this.root,
            { ...this.state, path }) as TNewEntityQuery;
    }

    cast<TNewEntityQuery>(
        cast: (caster: TCaster) => CastSelection<TNewEntityQuery>): TNewEntityQuery {

        if (this.state.query) {
            throw new Error("You cannot add query components before casting");
        }

        const newT = cast(this.buildCaster());
        const type = getCastingTypeRef(newT.type);

        const fullyQualifiedName = typeNameString(type, ".");
        const path = this.state.path?.length ? [...this.state.path, fullyQualifiedName] : [fullyQualifiedName];

        return new EntitySet<any, any, any, any, any, any, any, any, any>(
            this.requestTools,
            this.defaultResponseInterceptor,
            newT.type,
            this.entitySet,
            this.root,
            { ...this.state, path }) as TNewEntityQuery;
    }

    subPath<TNewEntityQuery>(
        subPath: (caster: TSubPath) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {

        if (this.state.query) {
            throw new Error("You cannot add query components before navigating a sub path");
        }

        if (this.type.isCollection) {
            console.log(this.type)
            throw new Error("You cannot navigate the subpath of a collection. Try to filter by key first");
        }

        const newT = subPath(this.buildSubPath(this.type));
        const prop = tryFindPropertyType(this.type, newT.propertyName, this.root.types);
        if (!prop) {
            throw new Error(`Invalid property ${newT.propertyName}`);
        }

        const path = this.state.path?.length ? [...this.state.path, newT.propertyName] : [newT.propertyName];

        return new EntitySet<any, any, any, any, any, any, any, any, any>(
            this.requestTools,
            this.defaultResponseInterceptor,
            prop,
            this.entitySet,
            this.root,
            { ...this.state, path }) as TNewEntityQuery;
    }

    // https://github.com/ShaneGH/magic-odata/issues/2
    withQuery(queryBuilder: (entity: TQueryable, utils: Utils) => Query | Query[], urlEncode?: boolean) {

        if (this.state.query) {
            throw new Error("This request already has a query");
        }

        const typeRef = getDeepTypeRef(this.type);
        if (typeRef.collectionDepth > 1) {
            throw new Error("Querying of collections of collections is not supported");
        }

        // There is a lot of trust in these 2 lines of code.
        // trust that the TEntity lines up with a typeRef in terms of being complex, primitive or enum
        const t = lookup(typeRef, this.root.types)
        const query = t.flag === "Complex"
            ? this.executeComplexQueryBuilder(t.type, queryBuilder as any)
            : t.flag === "Primitive"
                ? this.executePrimitiveQueryBuilder(t.type, queryBuilder as any)
                : this.executeEnumQueryBuilder(t.type, queryBuilder as any);

        return new EntitySet<TEntity, TResult, TKeyBuilder, TQueryable, TCaster, TSingleCaster, TSubPath, TSingleSubPath, TFetchResult>(
            this.requestTools,
            this.defaultResponseInterceptor,
            this.type,
            this.entitySet,
            this.root,
            { ...this.state, query: { query, urlEncode: urlEncode == undefined ? true : urlEncode } });
    }

    private executePrimitiveQueryBuilder(
        type: ODataTypeName,
        queryBuilder: PrimitiveQueryBuilder<TEntity>): Query | Query[] {

        const typeRef: QueryPrimitive<TEntity> = {
            $$oDataQueryObjectType: QueryObjectType.QueryPrimitive,
            $$oDataQueryMetadata: {
                typeRef: {
                    isCollection: false,
                    ...type
                },
                queryAliases: {},
                root: this.root.types,
                path: [{
                    path: "$it",
                    navigationProperty: false
                }]
            }
        };

        return queryBuilder(typeRef, queryUtils());
    }

    private executeComplexQueryBuilder(
        type: ODataComplexType,
        queryBuilder: ComplexQueryBuilder<TEntity>): Query | Query[] {

        const typeRef: QueryComplexObject<TEntity> = buildComplexTypeRef(type, this.root.types);
        return queryBuilder(typeRef, queryUtils());
    }

    private executeEnumQueryBuilder(
        type: ODataEnum,
        queryBuilder: EnumQueryBuilder<TEntity>): Query | Query[] {

        const typeRef: QueryEnum<TEntity> = {
            $$oDataEnumType: type,
            $$oDataQueryObjectType: QueryObjectType.QueryEnum,
            $$oDataQueryMetadata: {
                root: this.root.types,
                typeRef: {
                    isCollection: false,
                    namespace: type.namespace,
                    name: type.name
                },
                queryAliases: {},
                path: [{
                    path: "$it",
                    navigationProperty: false
                }]
            }
        };

        return queryBuilder(typeRef, queryUtils());
    }

    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult;
    get<TOverrideResultType>(overrideRequestTools?: Partial<RequestTools<TFetchResult, TOverrideResultType>>): TOverrideResultType;
    get(overrideRequestTools?: Partial<RequestTools<TFetchResult, TResult>>): TResult {
        return this.fetch(this.path(), overrideRequestTools)
    }

    // // TODO: $count_fincution
    // // TODO: is response type correct?
    // count(overrideRequestTools?: Partial<RequestTools<TResult>>): Promise<TDataResult> {
    //     throw new Error()
    //     //return this.fetch(this.path("$count"), overrideRequestTools);
    // }

    private path(append?: string[] | string | undefined) {

        let path = this.state.path;
        if (typeof append === "string") {
            path = [...path, append]
        } else if (Array.isArray(append)) {
            path = [...path, ...append]
        }

        return path.join("/");
    }

    private fetch(relativePath: string, overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): TResult {

        const tools: RequestTools<TFetchResult, TResult> = {
            responseInterceptor: this.defaultResponseInterceptor,
            ...defaultRequestTools,
            ...this.requestTools,
            ...(overrideRequestTools || {})
        };

        const uri = tools.uriInterceptor!({
            uriRoot: tools.uriRoot,
            // if namespace === "", give null instead
            entitySetContainerName: this.entitySet.namespace || null,
            entitySetName: this.entitySet.name,
            relativePath: relativePath,
            query: buildQuery(this.state.query?.query || [], this.state.query?.urlEncode)
        });

        let init: RequestOptions = tools.requestInterceptor!(uri, {
            method: "GET",
            headers: [
                ["Content-Type", "application/json; charset=utf-8"],
                ["Accept", "application/json"],
                ["OData-Version", "4"]
            ]
        });

        return this
            .buildResponseInterceptorChain(overrideRequestTools)(tools.request(uri, init), uri, init)
    }

    private buildResponseInterceptorChain(overrideRequestTools: Partial<RequestTools<TFetchResult, TResult>> | undefined): RootResponseInterceptor<TFetchResult, TResult> {

        const l0 = this.defaultResponseInterceptor

        const i1 = this.requestTools.responseInterceptor
        const l1 = i1 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i1(input, uri, reqValues, l0))

        const i2 = overrideRequestTools?.responseInterceptor
        const l2 = i2 && ((input: TFetchResult, uri: string, reqValues: RequestOptions) => i2(input, uri, reqValues, l1 || l0))

        return l2 || l1 || l0
    }

    // TODO: duplicate_logic_key: caster
    private buildCaster(): TCaster {

        const { namespace, name, isCollection } = getCastingTypeRef(this.type);

        const inherits = Object
            .keys(this.root.types)
            .map(ns => Object
                .keys(this.root.types[ns])
                .map(t => this.root.types[ns][t]))
            .reduce((s, x) => [...s, ...x], [])
            .filter(x => x.containerType === "ComplexType"
                && x.type.baseType
                && x.type.baseType.namespace === namespace
                && x.type.baseType.name === name)
            .map(x => x.type as ODataComplexType)
            .map((x: ODataComplexType): ODataSingleTypeRef => ({
                isCollection: false,
                name: x.name,
                namespace: x.namespace
            }));

        const distinctNames = Object.keys(inherits
            .reduce((s, x) => ({ ...s, [x.name]: true }), {} as { [key: string]: boolean }))

        const getName = inherits.length === distinctNames.length
            ? (x: ODataSingleTypeRef) => x.name
            // TODO: test
            // TODO: this logic will be duplicated in the code gen project. Possible to merge?
            // TODO: change "_" character in config file
            : (x: ODataSingleTypeRef) => `${x.namespace}/${x.name}`.replace(/[^\w]/g, "_")

        const reAddCollection = (t: ODataSingleTypeRef): ODataTypeRef => isCollection
            ? { isCollection: true, collectionType: t }
            : t;

        return inherits
            .reduce((s, type) => ({
                ...s,
                [getName(type)]: (): CastSelection<any> => {
                    return {
                        type: reAddCollection(type)
                    }
                }
            }), {} as any);
    }

    private buildSubPath(type: ODataTypeName): TSubPath {

        return listAllProperties(lookupComplex(type, this.root.types), this.root.types, true)
            .reduce((s, x) => ({ ...s, [x]: { propertyName: x } }), {} as any);
    }
}