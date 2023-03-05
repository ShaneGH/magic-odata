import { Dict, ODataComplexType, ODataEntitySet, ODataEnum, ODataSchema, ODataServiceConfig, ODataTypeName, ODataTypeRef } from "magic-odata-shared"
import { Query } from "../queryBuilder.js"
import { typeNameString } from "../utils.js"
import { ParameterDefinition } from "./params.js"
import { DefaultResponseInterceptor, RequestTools } from "./requestTools.js"


export type EntitySetData<TFetchResult, TResult> = {
    tools: EntitySetTools<TFetchResult, TResult>
    state: EntityQueryState
}

export type EntitySetTools<TFetchResult, TResult> = {
    requestTools: RequestTools<TFetchResult, TResult>,
    defaultResponseInterceptor: DefaultResponseInterceptor<TFetchResult, TResult>,
    type: ODataTypeRef,
    entitySet: ODataEntitySet,
    root: ODataServiceConfig
}

export enum Accept {
    Json = "Json",
    Raw = "Raw",
    Integer = "Integer"
}

export type EntityQueryState = {
    path: string[]
    accept: Accept
    /** This dataParams contains arrays that might mutate. Make sure to use it after all
     * other operations are complete
     */
    mutableDataParams: ParameterDefinition[][]
    query: {
        query: Query[]
        urlEncode: boolean
    }
}

export function lookupComplex(
    type: ODataTypeName,
    root: Dict<ODataSchema>) {

    const result = lookup(type, root);
    if (result.flag !== "Complex") {
        throw new Error(`Could not find complex type ${typeNameString(type)}`)
    }

    return result.type;
}

export function tryFindPropertyType(
    type: ODataTypeName,
    propertyName: string,
    root: Dict<ODataSchema>): ODataTypeRef | null {

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
    root: Dict<ODataSchema>): LookupResults {

    if (type.namespace === "Edm") {
        return { flag: "Primitive", type }
    }

    const result = root[type.namespace] && root[type.namespace].types[type.name];
    if (!result) {
        throw new Error(`Could not find type ${type.namespace && `${type.namespace}/`}${type.name}`)
    }

    return result.containerType === "ComplexType"
        ? { flag: "Complex", type: result.type }
        : { flag: "Enum", type: result.type };
}

export function tryFindBaseType(
    type: ODataComplexType,
    root: Dict<ODataSchema>) {

    if (!type.baseType) {
        return null;
    }

    const result = root[type.baseType.namespace] && root[type.baseType.namespace].types[type.baseType.name]
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