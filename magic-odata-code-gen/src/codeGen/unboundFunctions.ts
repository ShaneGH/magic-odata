import { ODataSchema, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { buildGenerateUnboundFunction, GenerateUnboundFunction } from "./entityFunctions.js";
import { Keywords } from "./keywords.js";
import { getUnboundFunctionsName, sanitizeNamespace, Tab } from "./utils.js";

function mapSchema(tab: Tab, keywords: Keywords, generate: GenerateUnboundFunction, settings: CodeGenConfig | null | undefined, ns: { namespace: string, schema: ODataSchema }) {
    const { namespace, schema } = ns

    const inner = Object
        .keys(schema.entityContainers)
        .map(ec => generate(ec, schema.entityContainers[ec]))
        .join("\n\n")

    const type = `export type ${getUnboundFunctionsName(settings)} = {\n${tab(inner)}\n}`

    return namespace
        ? `export module ${sanitizeNamespace(namespace, settings)} {
${tab(type)}
}`
        : type
}

export function unboundFunctions(serviceConfig: ODataServiceConfig, keywords: Keywords, settings: CodeGenConfig | null | undefined, tab: Tab) {
    const generateUnboundFunction = buildGenerateUnboundFunction(serviceConfig, keywords, settings || null, tab)

    const functions = Object
        .keys(serviceConfig.schemaNamespaces)
        .map(namespace => ({ namespace, schema: serviceConfig.schemaNamespaces[namespace] }))
        .map(mapSchema.bind(null, tab, keywords, generateUnboundFunction, settings))
        .join("\n\n")

    return `/**
 * Unbound function definitions.
 */
${functions}`
}