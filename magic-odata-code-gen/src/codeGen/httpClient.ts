import { ODataComplexType, ODataEntitySet, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig, SupressWarnings } from "../config.js";
import { typeNameString, warn } from "../utils.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName, buildLookupComplexType, buildSanitizeNamespace, buildHttpClientType, Tab } from "./utils.js";

export function httpClient(
    serviceConfig: ODataServiceConfig,
    tab: Tab,
    keywords: Keywords,
    requestToolsGenerics: [string, string],
    parseResponseFunctionBody: string,
    settings: CodeGenConfig | null | undefined,
    warnings: SupressWarnings | null | undefined) {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const lookupComplexType = buildLookupComplexType(serviceConfig, settings);

    const getQueryableName = buildGetQueryableName(settings);
    const getCasterName = buildGetCasterName(settings)
    const getSubPathName = buildGetSubPathName(settings)
    const httpClientType = buildHttpClientType(serviceConfig.types, keywords, tab, settings || null);

    const methods = Object
        .keys(serviceConfig.entitySets)
        .sort((x, y) => x < y ? -1 : 1)
        .map(namespace => ({
            escapedNamespaceParts: sanitizeNamespace(namespace).split(".").filter(x => !!x),
            entitySets: Object
                .keys(serviceConfig.entitySets[namespace])
                .map(k => serviceConfig.entitySets[namespace][k])
        }))
        .map(x => methodsForEntitySetNamespace(x.escapedNamespaceParts, x.entitySets))
        .join("\n\n");

    const constructor = `constructor(private ${keywords._httpClientArgs}: ${keywords.RequestTools}<${requestToolsGenerics.join(", ")}>) { }`;

    return `
${parseResponse()}

${toODataTypeRef()}

/**
 * The http client which serves as an entry point to OData
 */
export class ${className()} {
${tab(constructor)}

${tab(methods)}
}`

    function className() {
        return settings?.oDataClientName || "ODataClient";
    }

    function toODataTypeRef() {
        return `function ${keywords.toODataTypeRef}(collection: boolean, namespace: string, name: string): ${keywords.ODataTypeRef} {
${tab(`const collectionType: ${keywords.ODataTypeRef} = { isCollection: false, name, namespace }`)}
${tab("return collection ? { isCollection: true, collectionType } : collectionType")}
}`
    }

    function parseResponse() {

        return `const ${keywords.responseParser}: ${keywords.DefaultResponseInterceptor}<${requestToolsGenerics.join(", ")}> = (response, url, options, parseString) => {

${tab(parseResponseFunctionBody)}
}`
    }

    function methodsForEntitySetNamespace(
        entitySetNamespaceParts: string[],
        entitySets: ODataEntitySet[],
        first = true): string {

        if (!entitySetNamespaceParts.length) {
            return [...entitySets]
                .sort((x, y) => x.name < y.name ? -1 : 1)
                .map(x => methodForEntitySet(x, first))
                .filter(x => x)
                .join(first ? "\n\n" : ",\n\n");
        }

        const methods = tab(methodsForEntitySetNamespace(
            entitySetNamespaceParts.slice(1),
            entitySets,
            false));

        const cacheArgs = first
            // TODO: weird error. If I remove the ";" from this.${keywords._httpClientArgs};, the last letter of 
            // _httpClientArgs also disappears
            ? tab(`const ${keywords._httpClientArgs} = this.${keywords._httpClientArgs};`)
            : ""

        return `get ${entitySetNamespaceParts[0]}() {
${cacheArgs}
${tab(`return {
${methods}
}`)}
}`;
    }

    function methodForEntitySet(entitySet: ODataEntitySet, hasThisContext: boolean): string | undefined {

        const type = lookupComplexType(entitySet.forType);
        if (!type) {
            warn(warnings, "suppressUnableToFindTypeForEntitySet", `Could not find type for entity set: ${typeNameString(entitySet, settings)}.`);
            return undefined;
        }

        const generics = entitySet.isSingleton
            ? singletonGenerics(entitySet, type)
            : entitySetGenerics(entitySet, type);

        const ths = hasThisContext ? "this." : ""
        const instanceType = httpClientType(generics, false);
        const interfaceType = httpClientType(generics, true);
        const constructorArgs = {
            requestTools: `${ths}${keywords._httpClientArgs}`,
            defaultResponseInterceptor: `${keywords.responseParser}`,
            type: `${keywords.toODataTypeRef}(${!entitySet.isSingleton}, "${entitySet.forType.namespace || ""}", "${entitySet.forType.name}")`,
            entitySet: `${keywords.rootConfig}.entitySets["${entitySet.namespace || ""}"]["${entitySet.name}"]`,
            root: keywords.rootConfig
        } as any

        let args = Object
            .keys(constructorArgs)
            .map(x => `${x}: ${constructorArgs[x]}`)
            .join(",\n")

        args = `const args = {\n${tab(args)}\n}`

        return `get ${entitySet.name}() {
${tab(args)}

${tab(`return new ${instanceType}(args) as \n${tab(interfaceType)};`)}
}`
    }

    function entitySetGenerics(entitySet: ODataEntitySet, type: ODataComplexType) {
        const queryableType = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const subPathType = fullyQualifiedTsType(entitySet.forType, getSubPathName)
        const keyBuilderType = fullyQualifiedTsType(entitySet.forType, getKeyBuilderName)

        return {
            tKeyBuilder: keyBuilderType,
            tQueryable: queryableType,
            tCaster: `${casterType}.Collection`,
            tSingleCaster: `${casterType}.Single`,
            tSubPath: `${keywords.CollectionSubPath}<${queryableType}>`,
            tSingleSubPath: `${subPathType}`,
            tResult: {
                isCollection: true as true,
                collectionType: entitySet.forType
            }
        }
    }

    function singletonGenerics(entitySet: ODataEntitySet, type: ODataComplexType) {
        const queryableType = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const subPathType = fullyQualifiedTsType(entitySet.forType, getSubPathName)

        return {
            tKeyBuilder: keywords.SingleItemsCannotBeQueriedByKey,
            tQueryable: queryableType,
            tCaster: `${casterType}.Single`,
            tSingleCaster: `${casterType}.Single`,
            tSubPath: subPathType,
            tSingleSubPath: subPathType,
            tResult: entitySet.forType
        }
    }
}