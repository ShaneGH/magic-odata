import { ODataEntitySet, ODataSchema, ODataServiceConfig, Function, Dict } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { treeify, Node, flatten, toList, mapDict, groupBy, removeNulls, removeNullNulls } from "../utils.js";
import { Keywords } from "./keywords.js";
import {
    buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName, getEntitySetFunctionsName,
    buildGetSubPathName, buildSanitizeNamespace, buildHttpClientType, Tab, entitySetsName, httpClientName, getFetchResult, getUnboundFunctionsName
} from "./utils.js";


// TOOD: duplicate_logic HttpClient
export function httpClient(
    serviceConfig: ODataServiceConfig,
    tab: Tab,
    keywords: Keywords,
    requestToolsGenerics: [string, string],
    parseResponseFunctionBody: string,
    settings: CodeGenConfig | null | undefined) {

    const schemas = Object
        .keys(serviceConfig.schemaNamespaces)
        .map(x => httpClientForSchema(x, serviceConfig, tab, keywords, requestToolsGenerics, settings))
        .join("\n\n")

    return `${parseResponse()}

${toODataTypeRef()}

${toODataSchema()}

${toODataEntitySet()}

${schemas}`

    function toODataTypeRef() {
        return `function ${keywords.toODataTypeRef}(collection: boolean, namespace: string, name: string): ${keywords.ODataTypeRef} {
${tab(`const collectionType: ${keywords.ODataTypeRef} = { isCollection: false, name, namespace }
return collection ? { isCollection: true, collectionType } : collectionType`)}
}`
    }

    function toODataEntitySet() {
        return `function ${keywords.toODataEntitySet}(namespace: string, collection: string, entitySet: string): ${keywords.ODataEntitySet} {
${tab(`return ${keywords.toODataSchema}(namespace).entityContainers[collection || ""].entitySets[entitySet]`)}
}`
    }

    function toODataSchema() {
        return `function ${keywords.toODataSchema}(namespace: string): ${keywords.ODataSchema} {
${tab(`return ${keywords.rootConfig}.schemaNamespaces[namespace || ""]`)}
}`
    }

    function parseResponse() {

        return `const ${keywords.responseParser}: ${keywords.DefaultResponseInterceptor}<${requestToolsGenerics.join(", ")}> = (response, url, options, parseString) => {

${tab(parseResponseFunctionBody)}
}`
    }
}

type CollectionItem = { type: "EntitySet", value: ODataEntitySet } | { type: "Function", schemaName: string, containerName: string, value: Function }

function containerName(x: CollectionItem) {
    return x.type === "EntitySet" ? x.value.containerName : x.containerName
}

// TOOD: duplicate_logic HttpClient
function httpClientForSchema(
    schemaName: string,
    serviceConfig: ODataServiceConfig,
    tab: Tab,
    keywords: Keywords,
    requestToolsGenerics: [string, string],
    settings: CodeGenConfig | null | undefined) {

    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);

    const getQueryableName = buildGetQueryableName(settings);
    const getCasterName = buildGetCasterName(settings)
    const getSubPathName = buildGetSubPathName(settings)
    const httpClientType = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, settings || null);
    const constructorArgs = [
        `\nprivate ${keywords._httpClientArgs}: ${keywords.RequestTools}<${requestToolsGenerics.join(", ")}>`,
        `\nprivate ${keywords.serializerSettings}?: ${keywords.SerializerSettings}`
    ]
    const constructor = `constructor(${constructorArgs.map(tab).join(",")}) { }`;
    const name = httpClientName(settings)

    const module = `/**
 * A description of all of the entity sets in the ${schemaName && `${schemaName} `}OData schema
 */
export interface ${entitySetsName(settings)} {
${tab(entitySets(true))}
}

/**
 * The http client which serves as an entry point to the ${schemaName && `${schemaName} `}OData schema
 */
export class ${name} implements ${entitySetsName(settings)} {
${tab(constructor)}

${tab(entitySets(false))}
}`

    const ns = sanitizeNamespace(schemaName)
    return ns && settings?.addODataClientToNamespace
        ? `/**
 * Http client for all of the entity sets in the ${schemaName && `${schemaName} `}OData schema
 */
export module ${ns} {\n${tab(module)}\n}`
        : module

    function entitySets(isForInterface: boolean) {

        const entitySets = flatten(
            toList(serviceConfig.schemaNamespaces[schemaName].entityContainers)
                .map(([_, ctr]) => toList(ctr.entitySets)
                    .map(([_, x]) => ({ type: "EntitySet", value: x } as CollectionItem))))

        const functions = flatten(
            toList(serviceConfig.schemaNamespaces[schemaName].entityContainers)
                .map(([containerName, ctr]) => ctr.unboundFunctions
                    .map(x => ({ type: "Function", schemaName, containerName, value: x } as CollectionItem))))

        const entitySetsPerContainer = mapDict(groupBy(entitySets.concat(functions), x => x.type === "EntitySet" ? x.value.namespace : x.schemaName), es =>
            treeify(es.map(e => [sanitizeNamespace(containerName(e)).split(".").filter(x => !!x), e])))

        const keys = Object.keys(entitySetsPerContainer)
        return keys.length
            ? methodsForEntitySetNamespace(schemaName, [], isForInterface, entitySetsPerContainer[keys[0]])
            : ""
    }

    function methodsForEntitySetNamespace(
        schemaName: string,
        entitySetName: string[],
        isForInterface: boolean,
        entitySets: Node<CollectionItem[]>,
        first = true): string {

        const es = removeNullNulls(entitySets.value
            ?.map(x => x.type === "EntitySet" ? x.value : undefined))
            ?.map(x => methodForEntitySet(isForInterface, x, first))
            .filter(x => !!x) || []

        var containerName = (entitySets.value || []).map(x => x.type === "Function" ? x.containerName : null).filter(x => x != null)[0]
        const functions = (containerName != null && getFunctions(isForInterface, first, schemaName, containerName)) || ""

        const cacheArgs = !isForInterface && first
            // TODO: weird error. If I remove the ";" from this.${keywords._httpClientArgs};, the last letter of 
            // _httpClientArgs also disappears
            ? [
                `const ${keywords._httpClientArgs} = this.${keywords._httpClientArgs};\n`,
                `const ${keywords.serializerSettings} = this.${keywords.serializerSettings};\n`
            ].join("")
            : ""

        const subPaths = Object
            .keys(entitySets.children)
            .map(c => !isForInterface
                ? `get ${c}() {
${tab(`${cacheArgs}return {
${tab(methodsForEntitySetNamespace(schemaName, entitySetName.concat([c]), isForInterface, entitySets.children[c], false))}
}`)}
}`
                : `${c}: {
${tab(methodsForEntitySetNamespace(schemaName, entitySetName.concat([c]), isForInterface, entitySets.children[c], false))}
}`)

        return [
            functions,
            ...es,
            ...subPaths
        ].filter(x => x).join(first || isForInterface ? "\n\n" : ",\n\n")
    }

    function getFunctions(isForInterface: boolean, first: boolean, schemaName: string, containerName: string): string | undefined {
        const { async, fetchResponse } = getFetchResult(keywords, settings || null)
        const unboundFunctions = getUnboundFunctionsName(settings);
        const sanitizedNs = sanitizeNamespace(schemaName)
        const schema = `${sanitizedNs && `${sanitizedNs}.`}${unboundFunctions}["${containerName}"]`

        const selectorParams = [
            `entity: ${schema}`,
            `params: ${keywords.Params}<${entitySetsName(settings)}>`
        ].join(",\n")

        const signature = `unboundFunctions<TNewEntityQuery>(
${tab(`selector: (
${tab(selectorParams)}) => ${keywords.SubPathSelection}<TNewEntityQuery>): TNewEntityQuery`)}`

        if (isForInterface) {
            return signature
        }

        const generics = [
            entitySetsName(settings),
            schema,
            `${async}<${fetchResponse}>`
        ]

        const args = {
            root: "rootConfig",
            schemaName: `"${schemaName}"`,
            containerName: `"${containerName}"`,
            requestTools: `${(first && "this.") || ""}_httpClientArgs`,
            defaultResponseInterceptor: "responseParser",
            serializerSettings: {
                shortenEnumNames: `${(first && "this.") || ""}${keywords.serializerSettings}?.shortenEnumNames`,
                serviceConfig: "rootConfig.schemaNamespaces"
            }
        }

        const body = `const args = ${toTs(args)}

const entitySet = new ${keywords.UnboundFunctionSet}<${generics.join(", ")}>(args)

return entitySet.subPath(selector)`

        return `${signature} {\n\n${tab(body)}\n}`
    }

    function toTs(obj: Dict<string | Dict<string>>): string {
        const props = Object
            .keys(obj)
            .map(k => {
                const val = obj[k]
                return `${k}: ${typeof val === "string" ? val : toTs(val)}`;
            })
            .join(",\n")

        return !props.length ? "{}" : `{\n${tab(props)}\n}`
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
        const entitySetArg = `${keywords.toODataEntitySet}("${entitySet.namespace || ""}", "${entitySet.containerName || ""}", "${entitySet.name}")`
        const entitySetType = `${keywords.toODataTypeRef}(${!entitySet.isSingleton}, "${entitySet.forType.namespace || ""}", "${entitySet.forType.name}")`
        const constructorArgs = toTs({
            requestTools: `${ths}${keywords._httpClientArgs}`,
            defaultResponseInterceptor: keywords.responseParser,
            schema: `${keywords.toODataSchema}("${entitySet.namespace || ""}")`,
            root: keywords.rootConfig,
            serializerSettings: {
                shortenEnumNames: `${ths}${keywords.serializerSettings}?.shortenEnumNames`,
                serviceConfig: "rootConfig.schemaNamespaces"
            }
        })

        const args = `const args = ${tab(constructorArgs)}`

        return `get ${entitySet.name}() : \n${tab(interfaceType)} {

${tab(args)}

${tab(`return new ${instanceType}(args, ${entitySetArg}, ${entitySetType});`)}
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