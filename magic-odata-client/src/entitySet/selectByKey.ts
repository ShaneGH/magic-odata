import { ODataServiceTypes, ODataTypeName, ODataTypeRef } from "magic-odata-shared";
import { typeNameString } from "../utils.js";
import { serialize } from "../valueSerializer.js";
import { EntitySetData, lookupComplex, tryFindBaseType, tryFindPropertyType } from "./utils.js";

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

export type KeySelection<TNewEntityQuery> = {
    keyEmbedType: WithKeyType,
    key: any
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

type KeyType = { name: string, type: ODataTypeRef }
function tryFindKeyTypes(
    type: ODataTypeName,
    root: ODataServiceTypes): KeyType[] {

    const t = lookupComplex(type, root);
    return tryFindKeyNames(t, root)
        .map(name => ({ name, type: findPropertyType(t, name, root) }));
}

function tryFindKeyNames(
    type: ODataTypeName,
    root: ODataServiceTypes): string[] {

    const t = lookupComplex(type, root);
    if (t.keyProps) return t.keyProps;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindKeyNames(parent, root)) || []
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

export function recontextDataForKey<TFetchResult, TResult, TNewEntityQuery, TKeyBuilder>(
    data: EntitySetData<TFetchResult, TResult>,
    key: (builder: TKeyBuilder) => KeySelection<TNewEntityQuery>) {

    if (data.state.query) {
        throw new Error("You cannot add query components before doing a key lookup");
    }

    if (!data.state.path.length) {
        throw new Error("Invalid path");
    }

    if (!data.tools.type.isCollection) {
        throw new Error("Cannot search for a single type by key. You must search a collection instead");
    }

    if (data.tools.type.collectionType.isCollection) {
        throw new Error("Cannot search a collection of collections by key. You must search a collection instead");
    }

    const keyResult = key({
        key: (key: any, keyEmbedType?: WithKeyType.FunctionCall): KeySelection<any> => ({
            key, keyEmbedType: keyEmbedType || WithKeyType.FunctionCall
        })
    } as any);
    const keyTypes = tryFindKeyTypes(data.tools.type.collectionType, data.tools.root.types);
    const keyPath = keyExpr(keyTypes, keyResult.key, keyResult.keyEmbedType, data.tools.root.types);

    const path = keyPath.appendToLatest
        ? [
            ...data.state.path.slice(0, data.state.path.length - 1),
            `${data.state.path[data.state.path.length - 1]}${keyPath.value}`
        ]
        : [
            ...data.state.path,
            keyPath.value
        ]

    return {
        tools: {
            ...data.tools,
            type: data.tools.type.collectionType
        },
        state: {
            ...data.state,
            path
        }
    }
}