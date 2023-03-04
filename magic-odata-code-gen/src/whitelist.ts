import { ODataServiceConfig, ODataTypeRef } from "magic-odata-shared";
import { Config } from "./config.js";
import { flatten, keyDictionary, Writer } from "./utils.js";
import { visit } from "./visitor.js";

function typeRefString(type: ODataTypeRef, delimiter = "/"): string {
    return type.isCollection
        ? typeRefString(type.collectionType, delimiter)
        : typeNameString(type, delimiter)
}

function buildWhitelist(serviceConfig: ODataServiceConfig, entities: string[]) {

    const asLists = entities
        .map(entity => {
            const slash = entity.lastIndexOf("/")
            const ns = slash === -1 ? "" : entity.substring(0, slash)
            const name = slash === -1 ? entity : entity.substring(slash + 1)

            const type = serviceConfig.schemaNamespaces[ns]
                && serviceConfig.schemaNamespaces[ns].types[name]

            if (!type || type.containerType === "Enum") return [entity]

            const baseType = (type.type.baseType
                && [typeNameString(type.type.baseType)]) || []

            return Object
                .keys(type.type.properties)
                .map(p => type.type.properties[p])
                .filter(p => !p.navigationProperty)
                .map(p => typeRefString(p.type))
                .concat([entity])
                .concat(baseType)
        })

    return keyDictionary(flatten(asLists))
}

function typeNameString(type: { name: string, namespace: string }, delimiter = "/") {
    return `${type.namespace && `${type.namespace}${delimiter}`}${type.name}`
}

export function applyWhitelist(serviceConfig: ODataServiceConfig, settings: Config): ODataServiceConfig {

    if (!settings.codeGenSettings?.entityWhitelist?.entities) {
        return serviceConfig;
    }

    const realWhitelist = buildWhitelist(serviceConfig, settings.codeGenSettings.entityWhitelist.entities)

    const zero: string[] = []

    return visit<string[]>(serviceConfig, {
        zero,
        visitTypeName: typeName => typeName.namespace === "Edm"
            || realWhitelist[typeNameString(typeName)] ? Writer.create(typeName, zero) : undefined
    }).execute()[0]
}