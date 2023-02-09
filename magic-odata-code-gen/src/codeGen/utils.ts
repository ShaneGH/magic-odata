import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataSingleTypeRef, ComplexTypeOrEnum } from "magic-odata-shared";
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
        .map(_ => " ")
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

export function lintingAndComments() {
    return `// ReSharper disable InconsistentNaming
/* tslint:disable */
/* eslint-disable */

/********************************************************/
/********************************************************/
/****************                        ****************/
/***************   🎉 Auto generated 🎉  ***************/
/***************    by magic-odata-client    ***************/
/***************   ⚠️ Do not modify ⚠️   ***************/
/****************                        ****************/
/********************************************************/
/********************************************************/`
}

export function configObj(serviceConfig: ODataServiceConfig, keywords: Keywords, settings: CodeGenConfig | null | undefined, tab: Tab) {
    const oDataServiceConfig = !!settings?.prettyPrintJsonConfig
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

type SanitizeNamespace = (namespace: string) => string
export const buildSanitizeNamespace = (settings: CodeGenConfig | null | undefined): SanitizeNamespace => (namespace: string) => {
    return namespace.replace(/[^a-zA-Z0-9$._]/, settings?.namespaceSpecialCharacter || ".");
}

export type LookupType = (t: ODataSingleTypeRef) => ComplexTypeOrEnum | undefined

export const buildLookupType = (serviceConfig: ODataServiceConfig): LookupType => (t: ODataSingleTypeRef) => {
    return (serviceConfig.types[t.namespace] && serviceConfig.types[t.namespace][t.name]) || undefined
}

export type LookupComplexType = (t: ODataSingleTypeRef) => ODataComplexType | undefined

export const buildLookupComplexType = (serviceConfig: ODataServiceConfig): LookupComplexType => {
    const lt = buildLookupType(serviceConfig);
    return (t: ODataSingleTypeRef) => {
        const result = lt(t);
        if (!result || result.containerType === "ComplexType") return result?.type;

        throw new Error(`${typeNameString(t)} is not a complex type`);
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
    const lookupComplexType = buildLookupComplexType(serviceConfig)

    const getKeyType: GetKeyType = (t: ODataComplexType, lookupParent = true): string => {
        if (!t.keyProps) {
            if (t.baseType && lookupParent) {
                const baseType = lookupComplexType({ isCollection: false, namespace: t.baseType.namespace, name: t.baseType.name })
                if (!baseType) {
                    throw new Error(`Could not find base type: ${typeNameString(t.baseType)}`);
                }

                return getKeyType(baseType, lookupParent)
            }

            return keywords.ThisItemDoesNotHaveAKey;
        }

        const propTypes = t.keyProps.map(name => {
            const type = t.properties[name]?.type;
            if (!type) {
                throw new Error(`Could not find key property: ${name} of type ${typeNameString(t)}`)
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
    tEntity: string,
    tKeyBuilder: string,
    tQueryable: string,
    tCaster: string,
    tSingleCaster: string,
    tSubPath: string,
    tSingleSubPath: string,
    tResult: {
        resultType: string,
        collection: boolean
    }
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

const httpClientGenericNames = ["TEntity", "TDataResult", "TKeyBuilder", "TQueryable", "TCaster", "TSingleCaster", "TSubPath", "TSingleSubPath", "TFetchResult"]
const longest = httpClientGenericNames.map(x => x.length).reduce((s, x) => s > x ? s : x, -1);

export function httpClientType(keywords: Keywords, generics: HttpClientGenerics, tab: Tab, settings: CodeGenConfig | null, asInterface = true) {

    const angularResult = angularResultType(settings);

    const { async, fetchResponse } = settings?.angularMode || settings?.asyncType === AsyncType.RxJs
        ? { async: keywords.Observable, fetchResponse: `${keywords.AngularHttpResponse}<${angularResult}>` }
        : { async: "Promise", fetchResponse: "Response" };

    const gs = [
        generics.tEntity,
        generics.tResult.collection
            ? `${async}<${keywords.ODataCollectionResult}<${generics.tResult.resultType}>>`
            : `${async}<${keywords.ODataResult}<${generics.tResult.resultType}>>`,
        generics.tKeyBuilder,
        generics.tQueryable,
        generics.tCaster,
        generics.tSingleCaster,
        generics.tSubPath,
        generics.tSingleSubPath,
        `${async}<${fetchResponse}>`
    ]
        .map(addType)
        .map(tab)
        .join(",\n");

    return `${asInterface ? keywords.IEntitySet : keywords.EntitySet}<\n${gs}>`

    function addType(name: string, i: number) {
        const gType = httpClientGenericNames[i] || ""
        const padded = `/* ${gType} */ ` + [...Array(Math.max(0, longest - gType.length)).keys()].map(_ => " ").join("")

        return `${padded}${name}`
    }
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