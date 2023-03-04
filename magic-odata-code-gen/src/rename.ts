import { ODataServiceConfig } from "magic-odata-shared";
import { Config } from "./config.js";
import { Writer } from "./utils.js";
import { visit } from "./visitor.js";

function hasOwnProperty(x: any, prop: string) {
    return Object.prototype.hasOwnProperty.call(x, prop)
}

export function applyRenames(serviceConfig: ODataServiceConfig, settings: Config): ODataServiceConfig {

    if (!settings.codeGenSettings?.rename?.entityNamespaces
        || !settings.codeGenSettings?.rename?.entityContainers) {

        return serviceConfig
    }

    const entityNamespaces = settings.codeGenSettings.rename.entityNamespaces
    const entityContainers = settings.codeGenSettings.rename.entityContainers

    const zero: string[] = []

    return visit<string[]>(serviceConfig, {
        zero,
        visitTypeName: typeName => Writer.create(
            hasOwnProperty(entityNamespaces, typeName.namespace)
                ? {
                    name: typeName.name,
                    namespace: entityNamespaces[typeName.namespace]
                } : typeName, zero),

        visitSchemaNamespace: schemaNamespace => Writer.create(
            hasOwnProperty(entityNamespaces, schemaNamespace)
                ? entityNamespaces[schemaNamespace]
                : schemaNamespace, zero),

        visitContainerName: (_, containerName) => Writer.create(
            hasOwnProperty(entityContainers, containerName)
                ? entityContainers[containerName]
                : containerName, zero)
    }).execute()[0]
}