import { Dict, ODataCollectionTypeRef, ODataSchema, ODataServiceConfig, ODataSingleTypeRef, ODataTypeName, ODataTypeRef } from "magic-odata-shared"
import { ODataUriParts } from "../../entitySet/requestTools.js"
import { Accept } from "../../entitySet/utils.js"
import { IntegerTypes, resolveOutputType } from "../../query/filtering/queryPrimitiveTypes0.js"
import { AtParam, rawType } from "../../valueSerializer.js"

export const entity = Symbol("entity")

export type MappingUtils = {
    rootConfig: ODataServiceConfig
    currentContext: string
    encodeURIComponent(x: string): string
}

export type UriRoughwork = {
    paramMappings: [AtParam, ODataTypeRef][]
    accept: Accept
    oDataUriParts: ODataUriParts
}

export function appendPath(path1: string, path2: string, separator = "/") {
    return (path1 && path2 && `${path1}${separator}${path2}`) || path1 || path2
}

export function entityName(t: ODataTypeRef, rawNamedAny = false): string {

    if (t.isCollection) {
        return entityName(t.collectionType, rawNamedAny) + "[]"
    }

    return typeNameString(t, ".", rawNamedAny)
}

export function typeNameString(type: ODataTypeName, delimiter = "/", rawNamedAny = false) {
    if (rawNamedAny && type.namespace === rawType.namespace && type.name === rawType.name) {
        return "any"
    }

    return `${type.namespace && `${type.namespace}${delimiter}`}${type.name}`
}

export function expectSingle(t: ODataTypeRef): ODataSingleTypeRef {
    if (t.isCollection) throw new Error(`Expected single type: ${entityName(t)}`)
    return t
}

export function expectCollection(t: ODataTypeRef): ODataCollectionTypeRef {
    if (!t.isCollection) throw new Error(`Expected collection type: ${entityName(t)}`)
    return t
}

type UnwrappedCollection = { depth: number, type: ODataSingleTypeRef }

export function unwrapCollections(type: ODataTypeRef): UnwrappedCollection {
    if (!type.isCollection) {
        return { depth: 0, type }
    }

    const op = unwrapCollections(type.collectionType)
    return { ...op, depth: op.depth + 1 }
}

export function reWrapCollections(type: UnwrappedCollection): ODataTypeRef {
    if (!type.depth) {
        return type.type
    }

    return {
        isCollection: true,
        collectionType: reWrapCollections({ ...type, depth: type.depth - 1 })
    }
}

export function maybeAddParamMappings(s: UriRoughwork, paramMappings: [AtParam, ODataTypeRef][]) {
    return !paramMappings.length
        ? s
        : {
            ...s,
            paramMappings: [...s.paramMappings, ...paramMappings]
        }
}

const int64T = resolveOutputType(IntegerTypes.Int64)
export function expectPropertyOrErrorMsg(schemas: Dict<ODataSchema>, type: ODataTypeRef, property: string): string | ODataTypeRef {

    if (type.isCollection) {
        if (property === "$count") {
            return int64T
        }

        return `Property ${property} does not exist on type ${entityName(type)}.`
    }

    const fullType = schemas[type.namespace]?.types[type.name]
    if (!fullType) {
        return `Invalid type name ${typeNameString(type)}`
    }

    if (fullType.containerType !== "ComplexType") {
        return `Invalid type: ${typeNameString(type)}. Expected complex object`
    }

    const propType = fullType.type.properties[property]?.type
    if (!propType) {
        if (fullType.type.baseType) {
            return expectPropertyOrErrorMsg(schemas, { isCollection: false, ...fullType.type.baseType }, property)
        }

        return `Invalid property (${property}) on type ${typeNameString(type)}`
    }

    return propType
}

export function expectProperty(schemas: Dict<ODataSchema>, type: ODataTypeRef, property: string) {

    const result = expectPropertyOrErrorMsg(schemas, type, property)
    if (typeof result === "string") {
        throw new Error(result)
    }

    return result
}

export function dirFn<T extends Function>(f: T, args = -1): T {

    return function () {

        const dirArgs = args >= 0
            ? [...arguments].filter((_, i) => i < args)
            : [...arguments]

        const result = dir(f.apply(null, arguments))
        dir({
            args: dirArgs,
            result
        })
        return result
    } as any
}

export function dir<T>(x: T, message: any = ""): T {
    if (message != null && message !== "") console.log("##### ", message)
    console.dir(x, { depth: 10 })
    return x
}

export function log<T>(...xs: [T, ...any]): T {
    console.log(...xs)
    return xs[0]
}

export function logJson<T>(...xs: [T, ...any]): T {
    console.log(...xs.map(x => JSON.stringify(x, null, 2)))
    return xs[0]
}

export function logJsonFn<T extends Function>(f: T): T {
    return function () {
        const result = f.apply(null, arguments)
        logJson({
            args: Array.prototype.map.call(arguments, x => x),
            result
        })

        return result
    } as any
}