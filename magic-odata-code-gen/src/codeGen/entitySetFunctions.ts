import { ODataSchema, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { buildGenerateEntitySetFunction, GenerateEntitySetFunction } from "./entityFunctions.js";
import { Keywords } from "./keywords.js";
import { getEntitySetFunctionsName, sanitizeNamespace, Tab } from "./utils.js";

function mapSchema(tab: Tab, keywords: Keywords, generate: GenerateEntitySetFunction, settings: CodeGenConfig | null | undefined, ns: { namespace: string, schema: ODataSchema }) {
    const { namespace, schema } = ns

    const inner = Object
        .keys(schema.entityContainers)
        .map(ec => {
            const types = Object
                .keys(schema.entityContainers[ec].entitySets)
                .map(es => generate(schema.entityContainers[ec].entitySets[es]))
                .join("\n\n")

            return `"${ec}": {\n${tab(types)}\n}`
        })
        .join("\n\n")

    return `export module ${sanitizeNamespace(namespace, settings)} {
${tab(`export type ${getEntitySetFunctionsName(settings)} = {\n${tab(inner)}\n}`)}
}`
}

export function entitySetFunctions(serviceConfig: ODataServiceConfig, keywords: Keywords, settings: CodeGenConfig | null | undefined, tab: Tab) {
    const generateEntitySetFunction = buildGenerateEntitySetFunction(serviceConfig, keywords, settings || null, tab)

    const functions = Object
        .keys(serviceConfig.schemaNamespaces)
        .map(namespace => ({ namespace, schema: serviceConfig.schemaNamespaces[namespace] }))
        .map(mapSchema.bind(null, tab, keywords, generateEntitySetFunction, settings))
        .join("\n\n")

    return `/**
 * Entity set function definitions.
 */
${functions}`
}