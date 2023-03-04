import { ODataEntitySet, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { treeify, Node, flatten, toList, mapDict, groupBy } from "../utils.js";
import { Keywords } from "./keywords.js";
import {
    buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName, getEntitySetFunctionsName,
    buildGetSubPathName, buildSanitizeNamespace, buildHttpClientType, Tab, entitySetsName, httpClientName, getFetchResult
} from "./utils.js";


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

    const getQueryableName = buildGetQueryableName(settings);
    const getCasterName = buildGetCasterName(settings)
    const getSubPathName = buildGetSubPathName(settings)
    const httpClientType = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, settings || null);
    const constructor = `constructor(private ${keywords._httpClientArgs}: ${keywords.RequestTools}<${requestToolsGenerics.join(", ")}>) { }`;

    return `
${parseResponse()}

${toODataTypeRef()}

${toODataEntitySet()}

/**
 * A description of all of the entity in an OData model
 */
export interface ${entitySetsName(settings)} {
${tab(entitySets(true))}
}

/**
 * The http client which serves as an entry point to OData
 */
export class ${httpClientName(settings)} implements ${entitySetsName(settings)} {
${tab(constructor)}

${tab(entitySets(false))}
}`
    function entitySets(isForInterface: boolean) {

        const entitySets = flatten(flatten(
            toList(serviceConfig.schemaNamespaces)
                .map(([_, ns]) => toList(ns.entityContainers)
                    .map(([_, ctr]) => toList(ctr.entitySets)
                        .map(([_, x]) => x)))))

        const entitySetsPerContainer = mapDict(groupBy(entitySets, x => x.namespace), es =>
            treeify(es.map(e => [sanitizeNamespace(e.containerName).split(".").filter(x => !!x), e])))


        return methodsForEntitySetNamespace(isForInterface, entitySetsPerContainer[Object.keys(entitySetsPerContainer)[0]])
    }

    function toODataTypeRef() {
        return `function ${keywords.toODataTypeRef}(collection: boolean, namespace: string, name: string): ${keywords.ODataTypeRef} {
${tab(`const collectionType: ${keywords.ODataTypeRef} = { isCollection: false, name, namespace }
return collection ? { isCollection: true, collectionType } : collectionType`)}
}`
    }

    function toODataEntitySet() {
        return `function ${keywords.toODataEntitySet}(namespace: string, collection: string, entitySet: string): ${keywords.ODataEntitySet} {
${tab(`return ${keywords.rootConfig}.schemaNamespaces[namespace || ""].entityContainers[collection || ""].entitySets[entitySet]`)}
}`
    }

    function parseResponse() {

        return `const ${keywords.responseParser}: ${keywords.DefaultResponseInterceptor}<${requestToolsGenerics.join(", ")}> = (response, url, options, parseString) => {

${tab(parseResponseFunctionBody)}
}`
    }

    function methodsForEntitySetNamespace(
        isForInterface: boolean,
        entitySets: Node<ODataEntitySet[]>,
        first = true): string {

        const methods = entitySets.value?.map(x => methodForEntitySet(isForInterface, x, first)).filter(x => !!x) || []

        const cacheArgs = !isForInterface && first
            // TODO: weird error. If I remove the ";" from this.${keywords._httpClientArgs};, the last letter of 
            // _httpClientArgs also disappears
            ? `const ${keywords._httpClientArgs} = this.${keywords._httpClientArgs};\n`
            : ""

        const subPaths = Object
            .keys(entitySets.children)
            .map(c => !isForInterface
                ? `get ${c}() {
${tab(`${cacheArgs}return {
${tab(methodsForEntitySetNamespace(isForInterface, entitySets.children[c], false))}
}`)}
}`
                : `${c}: {
${tab(methodsForEntitySetNamespace(isForInterface, entitySets.children[c], false))}
}`)

        return [
            ...methods,
            ...subPaths
        ].join(first || isForInterface ? "\n\n" : ",\n\n")
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
            entitySet: `${keywords.toODataEntitySet}("${entitySet.namespace || ""}", "${entitySet.containerName || ""}", "${entitySet.name}")`,
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
        const mockedType = {
            isCollection: false as false,
            namespace: entitySet.namespace,
            name: getEntitySetFunctionsName(settings)
        }
        const functionsName = `${fullyQualifiedTsType(mockedType)}["${entitySet.containerName || ""}"]["${entitySet.name}"]`
        const { async, fetchResponse } = getFetchResult(keywords, settings || null)

        return {
            tKeyBuilder,
            tQueryable,
            tCaster: `${casterType}.Collection`,
            tSubPath: `${keywords.EntitySetSubPath}<${entitySetsName(settings)}, ${async}<number>, ${functionsName}, ${tQueryable}, ${async}<${fetchResponse}>>`,
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