import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataSingleTypeRef, ComplexTypeOrEnum, ODataSchema } from "magic-odata-shared";
import { AngularHttpResultType, AsyncType, CodeGenConfig } from "../config.js";
import { typeNameString } from "../utils.js";
import { Keywords } from "./keywords.js";

export type Dict<T> = { [key: string]: T }

const defaultTabs = 2;

export type Tab = {
    (text: string): string
    spaces: number
}

export function buildTab(settings: CodeGenConfig | null | undefined): Tab {
    const tabValue = [...Array(settings?.tabSize == null ? defaultTabs : settings.tabSize).keys()]
        .map(() => " ")
        .join("");

    function f(input: string) {

        return input
            .split(/\r?\n/)
            .map(x => tabValue + x)
            .join("\n");
    }

    f.spaces = tabValue.length

    return f;
}

export function comments() {
    return `/********************************************************/
/********************************************************/
/****************                        ****************/
/***************   🎉 Auto generated 🎉  ***************/
/**************    by magic-odata-client   **************/
/***************   ⚠️ Do not modify ⚠️   ***************/
/****************                        ****************/
/********************************************************/
/********************************************************/`
}

export function linting() {
    return `/* eslint-disable */
/* tslint:disable */
// ReSharper disable InconsistentNaming`
}

export function configObj(serviceConfig: ODataServiceConfig, keywords: Keywords, settings: CodeGenConfig | null | undefined, tab: Tab) {
    const oDataServiceConfig = settings?.prettyPrintJsonConfig
        ? JSON.stringify(serviceConfig, null, tab.spaces)
        : JSON.stringify(serviceConfig);

    const exportSettings = settings?.exportTypeDefinitionJsObject
        ? `/**
 * A copy of ${keywords.rootConfig}, exported for debug purposes.
 * Subject to breaking changes without warning
 */
export const ${keywords.rootConfigExporter} = (function () {
${tab(`const ${keywords.rootConfigExporter}: ${keywords.ODataServiceConfig} = JSON.parse(JSON.stringify(${keywords.rootConfig}))`)}
${tab(`return () => ${keywords.rootConfigExporter}`)}
}());`
        : ""

    return `/**
 * A config object which describes relationships between types.
 */
const ${keywords.rootConfig}: ${keywords.ODataServiceConfig} = ${oDataServiceConfig}

${exportSettings}`
}

export type SanitizeNamespace = (namespace: string) => string
export const buildSanitizeNamespace = (settings: CodeGenConfig | null | undefined): SanitizeNamespace => (namespace: string) => {
    return sanitizeNamespace(namespace, settings)
}

export const sanitizeNamespace = (namespace: string, settings: CodeGenConfig | null | undefined) => {
    return namespace.replace(/[^a-zA-Z0-9$._]/g, settings?.namespaceSpecialCharacter || ".");
}

export type LookupType = (t: ODataSingleTypeRef) => ComplexTypeOrEnum | undefined

export const buildLookupType = (serviceConfig: ODataServiceConfig): LookupType => (t: ODataSingleTypeRef) => {
    return (serviceConfig.schemaNamespaces[t.namespace] && serviceConfig.schemaNamespaces[t.namespace].types[t.name]) || undefined
}

export type LookupComplexType = (t: ODataSingleTypeRef) => ODataComplexType | undefined

export const buildLookupComplexType = (serviceConfig: ODataServiceConfig, settings: CodeGenConfig | null | undefined): LookupComplexType => {
    const lt = buildLookupType(serviceConfig);
    return (t: ODataSingleTypeRef) => {
        const result = lt(t);
        if (!result || result.containerType === "ComplexType") return result?.type;

        throw new Error(`${typeNameString(t, settings)} is not a complex type`);
    }
}

function id<T>(x: T) { return x }

export type FullyQualifiedTsType = (type: ODataTypeRef, transformTypeName?: ((name: string) => string) | undefined) => string
export const buildFullyQualifiedTsType = (settings: CodeGenConfig | null | undefined): FullyQualifiedTsType => {
    const sanitizeNamespace = buildSanitizeNamespace(settings)

    const fullyQualifiedTsType = (type: ODataTypeRef, transformTypeName?: ((name: string) => string) | undefined): string => {

        if (type.isCollection) {
            return `${fullyQualifiedTsType(type.collectionType, transformTypeName)}[]`
        }

        transformTypeName ??= id;
        const ns = type.namespace ? `${sanitizeNamespace(type.namespace)}.` : "";
        return `${ns}${transformTypeName(type.name)}`;
    }

    return fullyQualifiedTsType;
}

type KeyPropDescriptor = { name: string, type: ODataTypeRef }
function getKeyPropertyType(prop: ODataTypeRef, fullyQualifiedTsType: FullyQualifiedTsType): string {

    if (prop.isCollection) {
        return getKeyPropertyType(prop.collectionType, fullyQualifiedTsType) + "[]"
    }

    return fullyQualifiedTsType({
        isCollection: false,
        name: prop.name,
        namespace: prop.namespace
    });
}

function getKeyPropertiesType(props: KeyPropDescriptor[], fullyQualifiedTsType: FullyQualifiedTsType): string {

    if (props.length === 1) {
        return getKeyPropertyType(props[0].type, fullyQualifiedTsType);
    }

    const kvp = props
        .map(x => `${x.name}: ${getKeyPropertyType(x.type, fullyQualifiedTsType)}`)
        .join(", ");

    return `{ ${kvp} }`
}

export type GetKeyType = (t: ODataComplexType, lookupParent: boolean) => string
export const buildGetKeyType = (settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig, keywords: Keywords): GetKeyType => {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings)
    const lookupComplexType = buildLookupComplexType(serviceConfig, settings)

    const getKeyType: GetKeyType = (t: ODataComplexType, lookupParent = true): string => {
        if (!t.keyProps) {
            if (t.baseType && lookupParent) {
                const baseType = lookupComplexType({ isCollection: false, namespace: t.baseType.namespace, name: t.baseType.name })
                if (!baseType) {
                    throw new Error(`Could not find base type: ${typeNameString(t.baseType, settings)}`);
                }

                return getKeyType(baseType, lookupParent)
            }

            return keywords.ThisItemDoesNotHaveAKey;
        }

        const propTypes = t.keyProps.map(name => {
            const type = t.properties[name]?.type;
            if (!type) {
                throw new Error(`Could not find key property: ${name} of type ${typeNameString(t, settings)}`)
            }

            return { name, type };
        });

        return getKeyPropertiesType(propTypes, fullyQualifiedTsType);
    }

    return getKeyType;
}

export type GetTypeString = (type: ODataTypeRef) => string
export const buildGetTypeString = (settings: CodeGenConfig | null | undefined) => {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getTypeString = (type: ODataTypeRef): string => {

        if (type.isCollection) {
            return `${getTypeString(type.collectionType)}[]`;
        }

        return fullyQualifiedTsType(type);
    }

    return getTypeString;
}

export type HttpClientGenerics = {
    tResult: ODataTypeRef
    tResultNullable?: boolean
    rawResult?: boolean
    tKeyBuilder: string,
    tQueryable: string,
    tCaster: string,
    tSubPath: string
}

export function angularResultType(settings: CodeGenConfig | null): string | null {
    if (settings?.angularMode === true) {
        return "string"
    }

    if (!settings?.angularMode || typeof settings?.angularMode === "boolean") {
        return null;
    }

    return settings.angularMode.httpResultType === AngularHttpResultType.String
        ? "string"
        : settings.angularMode.httpResultType
}

const httpClientGenericNames = ["TRoot", "TEntity", "TResult", "TKeyBuilder", "TQueryable", "TCaster", "TSubPath", "TFetchResult"]

export function getFetchResult(keywords: Keywords, settings: CodeGenConfig | null) {
    const angularResult = angularResultType(settings);
    return settings?.angularMode || settings?.asyncType === AsyncType.RxJs
        ? { async: keywords.Observable, fetchResponse: `${keywords.AngularHttpResponse}<${angularResult}>` }
        : { async: "Promise", fetchResponse: "Response" };
}

export type HttpClientType = (generics: HttpClientGenerics, asInterface: boolean, genericDescription?: string) => string
export function buildHttpClientType(types: Dict<ODataSchema>, keywords: Keywords, tab: Tab, settings: CodeGenConfig | null): HttpClientType {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const { async, fetchResponse } = getFetchResult(keywords, settings)

    function addType(generics: string[], name: string, i: number) {
        const longest = generics.map(x => x.length).reduce((s, x) => s > x ? s : x, -1);
        const gType = generics[i] || ""
        const padded = `/* ${gType} */ ` + [...Array(Math.max(0, longest - gType.length)).keys()].map(() => " ").join("")

        return `${padded}${name}`
    }

    return (generics: HttpClientGenerics, asInterface: boolean, genericDescription?: string) => {

        const isEnum = !generics.tResult.isCollection
            && types[generics.tResult.namespace]
            && types[generics.tResult.namespace].types[generics.tResult.name]?.containerType === "Enum"

        const tEntity = generics.tResult.isCollection
            ? fullyQualifiedTsType(generics.tResult.collectionType)
            : fullyQualifiedTsType(generics.tResult)

        let tResult = fullyQualifiedTsType(generics.tResult);
        if (generics.tResultNullable) {
            tResult += " | null"
        }

        const genericNames = genericDescription
            ? httpClientGenericNames.map(x => `${x}${genericDescription}`)
            : httpClientGenericNames

        const gs = [
            entitySetsName(settings),
            tEntity,
            generics.rawResult
                ? `${async}<${tResult}>`
                : generics.tResult.isCollection || isEnum || generics.tResult.namespace === "Edm"
                    ? `${async}<${keywords.ODataCollectionResult}<${tResult}>>`
                    : `${async}<${keywords.ODataResult}<${tResult}>>`,
            generics.tKeyBuilder,
            generics.tQueryable,
            generics.tCaster,
            generics.tSubPath,
            `${async}<${fetchResponse}>`
        ]
            .map(addType.bind(null, genericNames))
            .map(tab)
            .join(",\n");

        return `${asInterface ? keywords.IEntitySet : keywords.RequestBuilder}<\n${gs}>`
    }
}

export function entitySetsName(settings: CodeGenConfig | null | undefined) {
    return `I${httpClientName(settings)}EntitySets`;
}

export function httpClientName(settings: CodeGenConfig | null | undefined) {
    return settings?.oDataClientName || "ODataClient";
}

export function getEntitySetFunctionsName(settings: CodeGenConfig | null | undefined) {
    return settings?.entitySetFunctionsTypeName || "EntitySetFunctions";
}

export function getUnboundFunctionsName(settings: CodeGenConfig | null | undefined) {
    return settings?.unboundFunctionsTypeName || "UnboundFunctions";
}

export type GetEntityFunctionsName = (forType: string) => string
export const buildGetEntityFunctionsName = (settings: CodeGenConfig | null | undefined): GetEntityFunctionsName => (forType: string) => {
    const qTemplate = settings?.entityFunctionContainerTypeNameTemplate || "{0}EntityFunctions";
    return qTemplate.replace(/\{0\}/g, forType);
}

export type GetSubPathName = (forType: string) => string
export const buildGetSubPathName = (settings: CodeGenConfig | null | undefined): GetSubPathName => (forType: string) => {
    const qTemplate = settings?.subPathTypeNameTemplate || "{0}SubPath";
    return qTemplate.replace(/\{0\}/g, forType);
}

export type GetCasterName = (forType: string) => string
export const buildGetCasterName = (settings: CodeGenConfig | null | undefined): GetCasterName => (forType: string) => {
    const qTemplate = settings?.casterTypeNameTemplate || "{0}Caster";
    return qTemplate.replace(/\{0\}/g, forType);
}

export type GetQueryableName = (forType: string) => string
export const buildGetQueryableName = (settings: CodeGenConfig | null | undefined): GetQueryableName => {

    return (forType: string) => {
        const qTemplate = settings?.queryableTypeNameTemplate || "Queryable{0}";
        return qTemplate.replace(/\{0\}/g, forType);
    }
}

export type GetKeyBuilderName = (forType: string) => string
export const buildGetKeyBuilderName = (settings: CodeGenConfig | null | undefined): GetKeyBuilderName => {

    return (forType: string) => {
        const qTemplate = settings?.keyBuilderTypeNameTemplate || "{0}KeyBuiler";
        return qTemplate.replace(/\{0\}/g, forType);
    }
}