import { ODataServiceConfig, ComplexTypeOrEnum, Dict } from "magic-odata-shared"
import { CodeGenConfig, SupressWarnings } from "../config.js"
import { warn } from "../utils.js"
import { buildEntityCasting } from "./entityCasting.js"
import { buildEntityData } from "./entityData.js"
import { buildGenerateEntityFunction } from "./entityFunctions.js"
import { buildEntityKeyBuilder } from "./entityKeyBuilder.js"
import { buildEntityQuery } from "./entityQuery.js"
import { buildEntitySubPath } from "./entitySubPath.js"
import { Keywords } from "./keywords.js"
import { buildSanitizeNamespace, Tab } from "./utils.js"

export type EntityParts = {
    data: string | null
    functions: string | null
    caster: string | null
    subPath: string | null
    query: string | null
    keyBuilder: string | null
}

type EntityBuilder = (type: ComplexTypeOrEnum) => EntityParts
const buildEntityBuilder = (settings: CodeGenConfig | null | undefined, tab: Tab, keywords: Keywords, serviceConfig: ODataServiceConfig): EntityBuilder => {

    const entityData = buildEntityData(settings, tab);
    const entityDataBuilder = buildEntityQuery(settings, tab, keywords, serviceConfig);
    const entityCastings = buildEntityCasting(tab, settings, serviceConfig, keywords);
    const entityKeyBuilder = buildEntityKeyBuilder(tab, settings, serviceConfig, keywords)
    const entitySubPathProps = buildEntitySubPath(tab, settings, serviceConfig, keywords);
    const entityFunctions = buildGenerateEntityFunction(serviceConfig, keywords, settings, tab)

    return (type: ComplexTypeOrEnum) => ({
        data: entityData(type),
        functions: type.containerType === "Enum" ? null : entityFunctions(type.type),
        query: entityDataBuilder(type),
        caster: entityCastings(type),
        keyBuilder: type.containerType === "ComplexType" ? entityKeyBuilder(type.type) : null,
        subPath: type.containerType === "ComplexType" ? entitySubPathProps(type.type) : null
    })
}

export type ProcessedNamespace = { [name: string]: EntityParts }
type NamespaceBuilder = (types: { [typeName: string]: ComplexTypeOrEnum }) => ProcessedNamespace
const buildNamespaceBuilder = (settings: CodeGenConfig | null | undefined, tab: Tab, keywords: Keywords, serviceConfig: ODataServiceConfig): NamespaceBuilder => {

    const entityBuilder = buildEntityBuilder(settings, tab, keywords, serviceConfig);
    return (namespace: Dict<ComplexTypeOrEnum>) => Object
        .keys(namespace)
        .reduce((s, x) => ({
            ...s,
            [x]: entityBuilder(namespace[x])
        }), {} as ProcessedNamespace);
}

export type ProcessedServiceConfig = { [name: string]: ProcessedNamespace }
export function processServiceConfig(settings: CodeGenConfig | null | undefined, tab: Tab, keywords: Keywords, serviceConfig: ODataServiceConfig,
    warnings: SupressWarnings | null | undefined) {
    const namespaceBuilder = buildNamespaceBuilder(settings, tab, keywords, serviceConfig);
    const sanitizeNamespace = buildSanitizeNamespace(settings);

    return Object
        .keys(serviceConfig.schemaNamespaces)
        .reduce((s, x) => {
            const namespaceName = sanitizeNamespace(x);
            if (s[namespaceName]) {
                warn(warnings, "suppressTypeNameOverlap", `Found multiple typescript schema definitions with the same name: ${namespaceName}. Some overlapped types will be missing from the generated client. `);
            }

            return {
                ...s,
                [x]: namespaceBuilder(serviceConfig.schemaNamespaces[x].types)
            }
        }, {} as ProcessedServiceConfig)
}