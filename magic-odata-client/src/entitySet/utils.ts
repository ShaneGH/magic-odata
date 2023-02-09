import { ODataComplexType, ODataEntitySet, ODataEnum, ODataServiceConfig, ODataServiceTypes, ODataTypeName, ODataTypeRef } from "magic-odata-shared"
import { Query } from "../queryBuilder.js"
import { typeNameString } from "../utils.js"
import { RequestTools, RootResponseInterceptor } from "./requestTools.js"


export type EntitySetData<TFetchResult, TResult> = {
    tools: EntitySetTools<TFetchResult, TResult>
    state: EntityQueryState
}

export type EntitySetTools<TFetchResult, TResult> = {
    requestTools: RequestTools<TFetchResult, TResult>,
    defaultResponseInterceptor: RootResponseInterceptor<TFetchResult, TResult>,
    type: ODataTypeRef,
    entitySet: ODataEntitySet,
    root: ODataServiceConfig
}

export type EntityQueryState = {
    path: string[]
    query?: {
        query: Query | Query[]
        urlEncode: boolean
    }
}

export function lookupComplex(
    type: ODataTypeName,
    root: ODataServiceTypes) {

    const result = lookup(type, root);
    if (result.flag !== "Complex") {
        throw new Error(`Could not find complex type ${typeNameString(type)}`)
    }

    return result.type;
}

export function tryFindPropertyType(
    type: ODataTypeName,
    propertyName: string,
    root: ODataServiceTypes): ODataTypeRef | null {

    const t = lookupComplex(type, root);
    if (t.properties[propertyName]) return t.properties[propertyName].type;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindPropertyType(parent, propertyName, root)) || null;
}

export type LookupResult<TFlag extends string, T> = {
    flag: TFlag
    type: T
}

export type LookupResults = LookupResult<"Complex", ODataComplexType> | LookupResult<"Primitive", ODataTypeName> | LookupResult<"Enum", ODataEnum>

export function lookup(
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

export function tryFindBaseType(
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

// unwraps an ODataTypeRef to 0 or 1 levels of collections or throws an error
export function getDeepTypeRef(type: ODataTypeRef): { name: string, namespace: string, collectionDepth: number } {

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