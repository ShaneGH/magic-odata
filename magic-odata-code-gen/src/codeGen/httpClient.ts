import { ODataComplexType, ODataEntitySet, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig, SupressWarnings } from "../config.js";
import { typeNameString } from "../utils.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetKeyType, buildGetQueryableName, buildGetSubPathName, buildLookupComplexType, buildLookupType, buildSanitizeNamespace, httpClientType, Tab } from "./utils.js";

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
    const lookupComplexType = buildLookupComplexType(serviceConfig);

    const getQueryableName = buildGetQueryableName(settings);
    const getCasterName = buildGetCasterName(settings)
    const getSubPathName = buildGetSubPathName(settings)

    // TODO: _httpClientArgs keyword is different to others.It needs to be unique from the point of
    // view of an EntitySet, not an Entity(or root namespace)
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

    // TODO: error handling
    function parseResponse() {

        return `const ${keywords.responseParser}: ${keywords.RootResponseInterceptor}<${requestToolsGenerics.join(", ")}> = response => {

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
            if (!warnings?.suppressAll && !warnings?.suppressUnableToFindTypeForEntitySet) {
                console.warn(`Could not find type for entity set: ${typeNameString(entitySet)}. `
                    // TODO: standardise "to suppress this warning text"
                    + "To supress this warning, set warningSettings.suppressUnableToFindTypeForEntitySet to false");
            }

            return undefined;
        }

        const generics = entitySet.isSingleton
            ? singletonGenerics(entitySet, type)
            : entitySetGenerics(entitySet, type);

        const ths = hasThisContext ? "this." : ""
        const instanceType = httpClientType(keywords, generics, tab, settings || null);
        const constructorArgs = [
            `${ths}${keywords._httpClientArgs}`,
            `${keywords.responseParser}`,
            `${keywords.toODataTypeRef}(${!entitySet.isSingleton}, "${entitySet.forType.namespace || ""}", "${entitySet.forType.name}")`,
            `${keywords.rootConfig}.entitySets["${entitySet.namespace || ""}"]["${entitySet.name}"]`,
            keywords.rootConfig
        ]

        return `get ${entitySet.name}() {
${tab(`return new ${instanceType}(${constructorArgs.join(", ")});`)}
}`
    }

    function entitySetGenerics(entitySet: ODataEntitySet, type: ODataComplexType) {
        const resultType = fullyQualifiedTsType(entitySet.forType);
        const queryableType = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const subPathType = fullyQualifiedTsType(entitySet.forType, getSubPathName)
        const keyBuilderType = fullyQualifiedTsType(entitySet.forType, getKeyBuilderName)

        return {
            tEntity: resultType,
            tKeyBuilder: keyBuilderType,
            tQueryable: queryableType,
            tCaster: `${casterType}.Collection`,
            tSingleCaster: `${casterType}.Single`,
            tSubPath: keywords.CollectionsCannotBeTraversed,
            tSingleSubPath: `${subPathType}`,
            tResult: {
                collection: true,
                resultType: `${resultType}[]`
            }
        }
    }

    function singletonGenerics(entitySet: ODataEntitySet, type: ODataComplexType) {
        const resultType = fullyQualifiedTsType(entitySet.forType);
        const queryableType = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const subPathType = fullyQualifiedTsType(entitySet.forType, getSubPathName)

        return {
            tEntity: resultType,
            tKeyBuilder: keywords.SingleItemsCannotBeQueriedByKey,
            tQueryable: queryableType,
            tCaster: `${casterType}.Single`,
            tSingleCaster: `${casterType}.Single`,
            tSubPath: subPathType,
            tSingleSubPath: subPathType,
            tResult: {
                collection: false,
                resultType: resultType
            }
        }
    }
}