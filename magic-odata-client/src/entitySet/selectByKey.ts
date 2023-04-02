import { Dict, ODataSchema, ODataTypeName, ODataTypeRef } from "magic-odata-shared";
import { Params } from "../entitySetInterfaces.js";
import { QbEmit } from "../queryBuilder.js";
import { typeNameString, Writer } from "../utils.js";
import { AtParam, serialize } from "../valueSerializer.js";
import { params } from "./params.js";
import { RequestBuilderData, lookupComplex, tryFindBaseType, tryFindPropertyType, EntityQueryState } from "./utils.js";

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
    raw: boolean
    keyEmbedType: WithKeyType,
    key: any
}

function findPropertyType(
    type: ODataTypeName,
    propertyName: string,
    root: Dict<ODataSchema>): ODataTypeRef {

    const result = tryFindPropertyType(type, propertyName, root);
    if (!result) {
        throw new Error(`Could not find property ${propertyName} on type ${typeNameString(type)}`);
    }

    return result;
}

type KeyType = { name: string, type: ODataTypeRef }
function tryFindKeyTypes(
    type: ODataTypeName,
    root: Dict<ODataSchema>): KeyType[] {

    const t = lookupComplex(type, root);
    return tryFindKeyNames(t, root)
        .map(name => ({ name, type: findPropertyType(t, name, root) }));
}

function tryFindKeyNames(
    type: ODataTypeName,
    root: Dict<ODataSchema>): string[] {

    const t = lookupComplex(type, root);
    if (t.keyProps) return t.keyProps;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindKeyNames(parent, root)) || []
}

function keyExpr(keyTypes: KeyType[], key: any, keyEmbedType: WithKeyType, serviceConfig: Dict<ODataSchema>) {

    if (key === undefined) key = null;

    if (keyTypes.length === 1) {
        const result = keyEmbedType === WithKeyType.FunctionCall
            ? serialize(key, keyTypes[0].type, serviceConfig).map(x => ({ appendToLatest: true, value: `(${x})` }))
            : keyEmbedType === WithKeyType.PathSegment
                ? serialize(key, keyTypes[0].type, serviceConfig).map(x => ({ appendToLatest: false, value: `${x}` }))
                : null;

        if (!result) {
            throw new Error(`Invalid WithKeyType: ${keyEmbedType}`);
        }

        return result.map(x => ({
            ...x,
            // TODO: should not be always encoded???  
            value: encodeURIComponent(x.value)
        }))
    }

    const kvp = keyTypes
        .map(t => Object.prototype.hasOwnProperty.call(key, t.name)
            ? serialize(key[t.name], t.type, serviceConfig).map(x => ({ key: t.name, value: x }))
            : t.name);

    const missingKeys = kvp.filter(x => typeof x === "string") as string[]

    if (missingKeys.length) {
        throw new Error(`Missing keys: ${missingKeys}`);
    }

    if (keyEmbedType !== WithKeyType.FunctionCall) {
        console.warn(`${keyEmbedType} key types are not supported for composite keys. Defaulting to ${WithKeyType.FunctionCall}`);
        keyEmbedType = WithKeyType.FunctionCall;
    }

    const value = Writer.traverse(kvp as Writer<{ key: string, value: string }, [AtParam, ODataTypeRef][]>[], [])
        .map(xs => xs
            .map(({ key, value }) => `${key}=${value}`)
            .join(","))

    return value.map(value => ({
        appendToLatest: true,
        // TODO: should not be always encoded???
        value: `(${encodeURIComponent(value)})`
    }))
}

function keyRaw(key: string): KeySelection<any> {
    return {
        key,
        raw: true,
        // key embed type is ignored. 
        // There is a weird type error preventing sum types here
        keyEmbedType: WithKeyType.FunctionCall
    }
}

function keyStructured(key: any, keyEmbedType?: WithKeyType.FunctionCall): KeySelection<any> {
    return {
        key,
        raw: false,
        keyEmbedType: keyEmbedType || WithKeyType.FunctionCall
    }
}

export function recontextDataForKey<TRoot, TFetchResult, TResult, TNewEntityQuery, TKeyBuilder>(
    data: RequestBuilderData<TFetchResult, TResult>,
    key: (builder: TKeyBuilder, params: Params<TRoot>) => KeySelection<TNewEntityQuery>)
    : Writer<EntityQueryState, QbEmit> {

    return data.state.bind(state => {
        if (!state.type.isCollection) {
            throw new Error("Cannot search for a single type by key. You must search a collection instead");
        }

        if (state.type.collectionType.isCollection) {
            throw new Error("Cannot search a collection of collections by key. You must search a collection instead");
        }

        const collectionType = state.type.collectionType

        if (state.query.query.length) {
            throw new Error("You cannot add query components before doing a key lookup");
        }

        if (!state.path.length) {
            throw new Error("Invalid path");
        }

        const [mutableParamDefinitions, paramsBuilder] = params<TRoot>(data.tools.requestTools.uriRoot,
            data.tools.root, data.tools.schema);
        const keyResult = key({ keyRaw, key: keyStructured } as any, paramsBuilder);
        const keyTypes = tryFindKeyTypes(collectionType, data.tools.root.schemaNamespaces);
        const keyPath = keyResult.raw
            ? Writer.create({ value: keyResult.key, appendToLatest: keyResult.key[0] === "(" }, [] as [AtParam, ODataTypeRef][])
            : keyExpr(keyTypes, keyResult.key, keyResult.keyEmbedType, data.tools.root.schemaNamespaces);

        return keyPath
            .mapAcc(x => QbEmit.maybeZero([mutableParamDefinitions], x))
            .map(keyPath => {

                const path = keyPath.appendToLatest
                    ? [
                        ...state.path.slice(0, state.path.length - 1),
                        `${state.path[state.path.length - 1]}${keyPath.value}`
                    ]
                    : [
                        ...state.path,
                        keyPath.value
                    ]

                return {
                    ...state,
                    type: collectionType,
                    path
                }
            })
    })
}