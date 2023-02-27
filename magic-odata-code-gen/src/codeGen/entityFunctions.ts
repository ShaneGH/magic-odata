import { ODataServiceConfig, Function, ODataComplexType, ODataEntitySet } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { buildGetTypeForSubPath, GetTypeForSubPath } from "./entitySubPath.js";
import { Keywords } from "./keywords.js";
import {
    buildGetEntityFunctionsName, buildGetEntitySetFunctionsName,
    buildGetUnboundFunctionsName, buildFullyQualifiedTsType, FullyQualifiedTsType, Tab,
    HttpClientType, buildHttpClientType, buildLookupType, LookupType, GetKeyBuilderName, buildGetKeyBuilderName, buildGetQueryableName, buildGetCasterName, buildGetSubPathName
} from "./utils.js";

export function generateUnboundFunctionTypes(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig, tab: Tab): string {

    const getUnboundFunctionsName = buildGetUnboundFunctionsName(config);
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.types, keywords, tab, config)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.types,
        typeName,
        buildGetQueryableName(config),
        buildGetCasterName(config),
        buildGetSubPathName(config),
        buildGetKeyBuilderName(config),
        keywords,
        httpClient,
        config || null);

    const functions = (serviceConfig.unboundFunctions || [])
        .map(mapFunction.bind(null, typeName, getTypeForSubPath))

    return `export type ${getUnboundFunctionsName()}
${tab(functions.join("\n\n"))}
`
}

export type GenerateEntityFunction = (e: ODataComplexType) => string
export function buildGenerateEntityFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig | undefined | null, tab: Tab): GenerateEntityFunction {
    const getEntityFunctionsName = buildGetEntityFunctionsName(config);
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.types, keywords, tab, config || null)
    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.types,
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
export function buildGenerateEntitySetFunction(serviceConfig: ODataServiceConfig, keywords: Keywords, config: CodeGenConfig, tab: Tab): GenerateEntitySetFunction {
    const getEntitySetFunctionsName = buildGetEntitySetFunctionsName(config);
    const typeName = buildFullyQualifiedTsType(config)
    const httpClient = buildHttpClientType(serviceConfig.types, keywords, tab, config)

    const getTypeForSubPath = buildGetTypeForSubPath(
        serviceConfig.types,
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

        return `export type ${getEntitySetFunctionsName(e.name)}
${tab(functions.join("\n\n"))}
`
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