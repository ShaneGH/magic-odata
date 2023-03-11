import { ODataServiceConfig, Function, ODataComplexType, ODataEntitySet, ODataSchema, EntityContainer } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { buildGetTypeForSubPath, GetTypeForSubPath } from "./entitySubPath.js";
import { Keywords } from "./keywords.js";
import {
    buildGetEntityFunctionsName,
    buildGetUnboundFunctionsName, buildFullyQualifiedTsType, FullyQualifiedTsType, Tab,
    buildHttpClientType, buildGetKeyBuilderName, buildGetQueryableName, buildGetCasterName, buildGetSubPathName
} from "./utils.js";

export function generateUnboundFunctionTypes(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig, tab: Tab): string {

    return ""
    //     const getUnboundFunctionsName = buildGetUnboundFunctionsName(config);
    //     const typeName = buildFullyQualifiedTsType(config)
    //     const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config)
    //     const getTypeForSubPath = buildGetTypeForSubPath(
    //         serviceConfig.schemaNamespaces,
    //         typeName,
    //         buildGetQueryableName(config),
    //         buildGetCasterName(config),
    //         buildGetSubPathName(config),
    //         buildGetKeyBuilderName(config),
    //         keywords,
    //         httpClient,
    //         config || null);

    //     const functions = (serviceConfig.unboundFunctions || [])
    //         .map(mapFunction.bind(null, typeName, getTypeForSubPath))

    //     return `export type ${getUnboundFunctionsName()}
    // ${tab(functions.join("\n\n"))}
    // `
}

export type GenerateEntityFunction = (e: ODataComplexType) => string
export function buildGenerateEntityFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | undefined | null, tab: Tab): GenerateEntityFunction {
    const getEntityFunctionsName = buildGetEntityFunctionsName(config);
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config || null)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        buildGetQueryableName(config),
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config || null);

    return e => {
        const functions = (e.functions || [])
            .map(mapFunction.bind(null, typeName, getTypeForSubPath))

        return `export type ${getEntityFunctionsName(e.name)} = {
${tab(functions.join("\n\n"))}
}`
    }
}

export type GenerateEntitySetFunction = (es: ODataEntitySet) => string
export function buildGenerateEntitySetFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | null, tab: Tab): GenerateEntitySetFunction {
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config)

    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        buildGetQueryableName(config),
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config);

    return e => {
        const functions = (e.collectionFunctions || [])
            .map(mapFunction.bind(null, typeName, getTypeForSubPath))

        return `${e.name}: {
${tab(functions.join("\n\n"))}
}`
    }
}

export type GenerateUnboundFunction = (name: string, es: EntityContainer) => string
export function buildGenerateUnboundFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | null, tab: Tab): GenerateUnboundFunction {
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, config)

    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.schemaNamespaces,
        typeName,
        buildGetQueryableName(config),
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config);

    return (name, e) => {
        const functions = (e.unboundFunctions || [])
            .map(mapFunction.bind(null, typeName, getTypeForSubPath))

        return `"${name}": {
${tab(functions.join("\n\n"))}
}`
    }
}

function mapFunction(typeName: FullyQualifiedTsType, getTypeForSubPath: GetTypeForSubPath, f: Function) {
    const params = f.params
        .filter(p => !p.isBindingParameter)
        .map(p => `${p.name}: ${typeName(p.type)}`).join(", ")

    const paramsObj = params
        ? `inputs: { ${params} }`
        : "";

    return `${f.name}(${paramsObj}): ${getTypeForSubPath(f.returnType)};`
}