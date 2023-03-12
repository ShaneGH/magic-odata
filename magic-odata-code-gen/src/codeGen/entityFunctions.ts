import { ODataServiceConfig, Function, ODataComplexType, ODataEntitySet, ODataSchema, EntityContainer, FunctionParam, ODataTypeRef } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { getQueryableTypeString } from "./entityQuery.js";
import { buildGetTypeForSubPath, GetTypeForSubPath } from "./entitySubPath.js";
import { Keywords } from "./keywords.js";
import {
    buildGetEntityFunctionsName,
    buildFullyQualifiedTsType, FullyQualifiedTsType, Tab,
    buildHttpClientType, buildGetKeyBuilderName, buildGetQueryableName, buildGetCasterName, buildGetSubPathName, GetQueryableName
} from "./utils.js";

export type GenerateEntityFunction = (e: ODataComplexType) => string
export function buildGenerateEntityFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | undefined | null, tab: Tab): GenerateEntityFunction {
    const getEntityFunctionsName = buildGetEntityFunctionsName(config);
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config || null)
    const getQueryableName = buildGetQueryableName(config)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        getQueryableName,
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config || null);
    const mapFunction = buildMapFunction(getTypeForSubPath, keywords, serviceConfig, config, typeName, getQueryableName, tab);

    return e => {
        const functions = (e.functions || [])
            .map(mapFunction)

        return `export type ${getEntityFunctionsName(e.name)} = {
${tab(functions.join("\n\n"))}
}`
    }
}

export type GenerateEntitySetFunction = (es: ODataEntitySet) => string
export function buildGenerateEntitySetFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | null, tab: Tab): GenerateEntitySetFunction {
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config)

    const getQueryableName = buildGetQueryableName(config)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        getQueryableName,
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config);
    const mapFunction = buildMapFunction(getTypeForSubPath, keywords, serviceConfig, config, typeName, getQueryableName, tab);

    return e => {
        const functions = (e.collectionFunctions || [])
            .map(mapFunction)

        return `${e.name}: {
${tab(functions.join("\n\n"))}
}`
    }
}

export type GenerateUnboundFunction = (name: string, es: EntityContainer) => string
export function buildGenerateUnboundFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | null, tab: Tab): GenerateUnboundFunction {
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config)
    const getQueryableName = buildGetQueryableName(config)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        getQueryableName,
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config);
    const mapFunction = buildMapFunction(getTypeForSubPath, keywords, serviceConfig, config, typeName, getQueryableName, tab);

    return (name, e) => {
        const functions = (e.unboundFunctions || [])
            .map(mapFunction)

        return `"${name}": {
${tab(functions.join("\n\n"))}
}`
    }
}

type MapFunction = (f: Function) => string
function buildMapFunction(getTypeForSubPath: GetTypeForSubPath, keywords: Keywords, serviceConfig: ODataServiceConfig,
    settings: CodeGenConfig | null | undefined, fullyQualifiedTsType: FullyQualifiedTsType, getQueryableName: GetQueryableName, tab: Tab): MapFunction {

    function qts(t: ODataTypeRef, isNullable: boolean): string {

        const rawT = t.isCollection
            // do not handle collections naturally. Need to embed the QueryTypes in the collection
            ? `(${qts(t.collectionType, false)})[]`
            : fullyQualifiedTsType(t)

        return [
            rawT,
            isNullable ? "null" : null,
            getQueryableTypeString(t, true, keywords, serviceConfig, settings, fullyQualifiedTsType, getQueryableName)
        ]
            .filter(x => !!x)
            .join(" | ")
    }

    return f => {
        const params = f.params
            .filter(p => !p.isBindingParameter)
            .map(p => `${p.name}: ${qts(p.type, p.isNullable)}`).join(",\n")

        const paramsObj = params
            ? `inputs: {\n${tab(params)}\n}`
            : "";

        return `${f.name}(${paramsObj}): ${getTypeForSubPath(f.returnType, f.returnTypeNullable)};`

    }
}