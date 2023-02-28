import { ODataEntitySets, ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { buildGenerateEntitySetFunction, GenerateEntitySetFunction } from "./entityFunctions.js";
import { Keywords } from "./keywords.js";
import { sanitizeNamespace, Tab } from "./utils.js";

function mapNamespace(generate: GenerateEntitySetFunction, settings: CodeGenConfig | null | undefined, ns: { namespace: string, values: ODataEntitySets }) {
    const { namespace, values } = ns
    return {
        moduleName: sanitizeNamespace(namespace, settings),
        entitySets: Object
            .keys(values)
            .map(es => generate(values[es]))
    }
}

export function entitySetFunctions(serviceConfig: ODataServiceConfig, keywords: Keywords, settings: CodeGenConfig | null | undefined, tab: Tab) {
    const generateEntitySetFunction = buildGenerateEntitySetFunction(serviceConfig, keywords, settings || null, tab)

    const functions = Object
        .keys(serviceConfig.entitySets)
        .map(namespace => ({ namespace, values: serviceConfig.entitySets[namespace] }))
        .map(mapNamespace.bind(null, generateEntitySetFunction, settings))
        .map(({ moduleName, entitySets }) => moduleName
            ? `export module ${moduleName} {
${tab(entitySets.join("\n\n"))}
}`
            : tab(entitySets.join("\n\n")))
        .join("\n\n")

    return `/**
 * Entity set function definitions.
 */
${functions}`
}