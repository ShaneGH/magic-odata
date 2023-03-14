import { ODataCollectionTypeRef, ODataSchema, ODataServiceConfig, ODataSingleTypeRef, ODataTypeName, ODataTypeRef } from "magic-odata-shared"
import { lookupComplex, tryFindBaseType, tryFindPropertyType } from "../../entitySet/utils.js"
import { Dict, ReaderState, typeNameString, Writer } from "../../utils.js"
import { AtParam, serialize } from "../../valueSerializer.js"
import { WithKeyType } from "../entityContainer.js"
import { Key } from "../uriEvents/uriPartStream.js"
import { appendPath, entityName, expectSingle, MappingUtils, maybeAddParamMappings, UriRoughwork } from "./utils.js"


type Kvp<T> = { key: string, value: T }
type KeyExprAcc<T> = [Kvp<T>[], string[]]

function tryFindKeyNames(
    type: ODataTypeName,
    root: Dict<ODataSchema>): string[] {

    const t = lookupComplex(type, root);
    if (t.keyProps) return t.keyProps;

    const parent = tryFindBaseType(t, root);
    return (parent && tryFindKeyNames(parent, root)) || []
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

function tryFindKeyTypes(
    type: ODataTypeName,
    root: Dict<ODataSchema>): Kvp<ODataTypeRef>[] {

    const t = lookupComplex(type, root);
    return tryFindKeyNames(t, root)
        .map(key => ({ key, value: findPropertyType(t, key, root) }));
}

function lookupKeyTypes(keyEntity: ODataSingleTypeRef, serviceConfig: ODataServiceConfig) {

    const keyTypes = tryFindKeyTypes(keyEntity, serviceConfig.schemaNamespaces)
    if (!keyTypes || !keyTypes.length) {

        console.warn(`Could not find key types for entity: ${entityName(keyEntity)}`)
        return null
    }

    return keyTypes
}

function keyExpr(keyEntity: ODataSingleTypeRef, key: any, serviceConfig: ODataServiceConfig) {

    if (key === undefined) key = null;

    const keyTypes = lookupKeyTypes(keyEntity, serviceConfig)
    if (!keyTypes) throw new Error(`Entity ${typeNameString(keyEntity)} does not have any keys defined`)

    if (keyTypes.length === 1) {
        return serialize(key, keyTypes[0].value, serviceConfig.schemaNamespaces)
            .map(value => ({ composite: false, value }))
    }

    const kvp = keyTypes
        .map(t => Object.prototype.hasOwnProperty.call(key, t.key)
            ? { key: t.key, value: serialize(key[t.key], t.value, serviceConfig.schemaNamespaces) }
            : t.key)
        .reduce(
            ([s, err], x) => (typeof x !== "string" ? [[...s, x], err] : [s, [...err, x]]) as KeyExprAcc<Writer<string, [AtParam, ODataTypeRef][]>>,
            [[], []] as KeyExprAcc<Writer<string, [AtParam, ODataTypeRef][]>>);

    const [keys, err] = kvp

    if (err.length) {
        throw new Error(`Missing values on key for ${typeNameString(keyEntity)}: ${err.join(", ")}`)
    }

    return Writer
        .traverse(keys
            .map(({ key, value }) => value.map(value => ({ key, value }))), [])
        .map(xs => xs
            .map(({ key, value }) => `${key}=${value}`)
            .join(","))
        .map(value => ({ composite: true, value }))
}

function addKey(s: UriRoughwork, key: string, separator: string): UriRoughwork {
    if (Object.keys(s.oDataUriParts.query).length) {
        throw new Error("You cannot add query components before doing a key lookup");
    }

    if (!s.oDataUriParts.relativePath) {
        throw new Error("Invalid path");
    }

    return {
        ...s,
        oDataUriParts: {
            ...s.oDataUriParts,
            relativePath: appendPath(s.oDataUriParts.relativePath, key, separator)
        }
    }
}

export function mapKey(x: Key, type: ODataCollectionTypeRef): ReaderState<MappingUtils, ODataTypeRef, UriRoughwork> {

    if (x.type === "Raw") {

        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((_, s) => [
            type.collectionType,
            addKey(s, x.data, x.data.startsWith("(") ? "" : "/")
        ])
    }

    if (x.type === "PathSegment") {
        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {

            const singleType = expectSingle(type.collectionType)
            const keys = keyExpr(singleType, x.data.keyData, env.rootConfig)

            const [{ composite, value }, paramMappings] = keys.execute()

            if (composite) {
                // TODO: test
                console.warn(`${WithKeyType.PathSegment} key types are not supported for composite keys. Defaulting to ${WithKeyType.FunctionCall}`);
                return mapKey({ type: "FunctionCall", data: x.data }, type).execute(env, s)
            }

            s = maybeAddParamMappings(s, paramMappings)
            return [singleType, addKey(s, value, "/")]
        })
    }

    return ReaderState
        .create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {

            const singleType = expectSingle(type.collectionType)
            const keys = keyExpr(singleType, x.data.keyData, env.rootConfig)
            if (!keys) return [singleType, s]

            const [{ value }, paramMappings] = keys.execute()
            s = maybeAddParamMappings(s, paramMappings)
            return [singleType, addKey(s, `(${value})`, "")]
        })

}
