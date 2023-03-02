import { ODataEntitySet, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName, buildSanitizeNamespace, buildHttpClientType, Tab, entitySetsName, httpClientName, buildGetEntitySetFunctionsName } from "./utils.js";

// TOOD: duplicate_logic HttpClient
export function httpClient(
    serviceConfig: ODataServiceConfig,
    tab: Tab,
    keywords: Keywords,
    requestToolsGenerics: [string, string],
    parseResponseFunctionBody: string,
    settings: CodeGenConfig | null | undefined) {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);

    const getEntitySetFunctionsName = buildGetEntitySetFunctionsName(settings)
    const getQueryableName = buildGetQueryableName(settings);
    const getCasterName = buildGetCasterName(settings)
    const getSubPathName = buildGetSubPathName(settings)
    const httpClientType = buildHttpClientType(serviceConfig.types, keywords, tab, settings || null);
    const constructor = `constructor(private ${keywords._httpClientArgs}: ${keywords.RequestTools}<${requestToolsGenerics.join(", ")}>) { }`;

    return `
${parseResponse()}

${toODataTypeRef()}

/**
 * A description of all of the entity in an OData model
 */
export interface ${entitySetsName(settings)} {
${tab(methods(true))}
}

/**
 * The http client which serves as an entry point to OData
 */
export class ${httpClientName(settings)} implements ${entitySetsName(settings)} {
${tab(constructor)}

${tab(methods(false))}
}`

    function methods(isForInterface: boolean) {
        return Object
            .keys(serviceConfig.entitySets)
            .sort((x, y) => x < y ? -1 : 1)
            .map(namespace => ({
                escapedNamespaceParts: sanitizeNamespace(namespace).split(".").filter(x => !!x),
                entitySets: Object
                    .keys(serviceConfig.entitySets[namespace])
                    .map(k => serviceConfig.entitySets[namespace][k])
            }))
            .map(x => methodsForEntitySetNamespace(isForInterface, x.escapedNamespaceParts, x.entitySets))
            .join("\n\n");
    }

    function toODataTypeRef() {
        return `function ${keywords.toODataTypeRef}(collection: boolean, namespace: string, name: string): ${keywords.ODataTypeRef} {
${tab(`const collectionType: ${keywords.ODataTypeRef} = { isCollection: false, name, namespace }
return collection ? { isCollection: true, collectionType } : collectionType`)}
}`
    }

    function parseResponse() {

        return `const ${keywords.responseParser}: ${keywords.DefaultResponseInterceptor}<${requestToolsGenerics.join(", ")}> = (response, url, options, parseString) => {

${tab(parseResponseFunctionBody)}
}`
    }

    function methodsForEntitySetNamespace(
        isForInterface: boolean,
        entitySetNamespaceParts: string[],
        entitySets: ODataEntitySet[],
        first = true): string {

        if (!entitySetNamespaceParts.length) {
            return [...entitySets]
                .sort((x, y) => x.name < y.name ? -1 : 1)
                .map(x => methodForEntitySet(isForInterface, x, first))
                .filter(x => x)
                .join(first || isForInterface ? "\n\n" : ",\n\n");
        }

        const methods = tab(methodsForEntitySetNamespace(
            isForInterface,
            entitySetNamespaceParts.slice(1),
            entitySets,
            false));

        if (isForInterface) {
            return `${entitySetNamespaceParts[0]}: {
${tab(methods)}
}`
        }

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

    function methodForEntitySet(isForInterface: boolean, entitySet: ODataEntitySet, hasThisContext: boolean): string | undefined {

        const generics = entitySet.isSingleton
            ? singletonGenerics(entitySet)
            : entitySetGenerics(entitySet);
        const interfaceType = httpClientType(generics, true);

        if (isForInterface) {
            return `${entitySet.name}: ${interfaceType};`;
        }

        const ths = hasThisContext ? "this." : ""
        const instanceType = httpClientType(generics, false);
        const constructorArgs = {
            requestTools: `${ths}${keywords._httpClientArgs}`,
            defaultResponseInterceptor: keywords.responseParser,
            type: `${keywords.toODataTypeRef}(${!entitySet.isSingleton}, "${entitySet.forType.namespace || ""}", "${entitySet.forType.name}")`,
            entitySet: `${keywords.rootConfig}.entitySets["${entitySet.namespace || ""}"]["${entitySet.name}"]`,
            root: keywords.rootConfig
        } as any

        let args = Object
            .keys(constructorArgs)
            .map(x => `${x}: ${constructorArgs[x]}`)
            .join(",\n")

        args = `const args = {\n${tab(args)}\n}`

        return `get ${entitySet.name}() : \n${tab(interfaceType)} {

${tab(args)}

${tab(`return new ${instanceType}(args);`)}
}`
    }

    function entitySetGenerics(entitySet: ODataEntitySet) {
        const tQueryable = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const tKeyBuilder = fullyQualifiedTsType(entitySet.forType, getKeyBuilderName)
        const mockedType = { isCollection: false as false, namespace: entitySet.namespace, name: entitySet.name }
        const functionsName = fullyQualifiedTsType(mockedType, getEntitySetFunctionsName)

        return {
            tKeyBuilder,
            tQueryable,
            tCaster: `${casterType}.Collection`,
            tSubPath: `${keywords.EntitySetSubPath}<${entitySetsName(settings)}, ${functionsName}, ${tQueryable}>`,
            tResult: {
                isCollection: true as true,
                collectionType: entitySet.forType
            }
        }
    }

    function singletonGenerics(entitySet: ODataEntitySet) {
        const tQueryable = fullyQualifiedTsType(entitySet.forType, getQueryableName);
        const casterType = fullyQualifiedTsType(entitySet.forType, getCasterName)
        const tSubPath = fullyQualifiedTsType(entitySet.forType, getSubPathName)

        return {
            tKeyBuilder: keywords.SingleItemsCannotBeQueriedByKey,
            tQueryable,
            tCaster: `${casterType}.Single`,
            tSubPath,
            tResult: entitySet.forType
        }
    }
}