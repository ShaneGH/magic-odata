import { ComplexTypeOrEnum, ODataComplexTypeProperty, ODataEntitySetNamespaces, ODataEntitySets, ODataServiceConfig, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared";
import { Config } from "./config.js";
import { typeNameString, warn } from "./utils.js";

type IsWhiteListed = (type: { name: string, namespace: string }) => boolean

export function applyWhitelist(serviceConfig: ODataServiceConfig, settings: Config): ODataServiceConfig {

    if (!settings.codeGenSettings?.entityWhitelist?.entities) {
        return serviceConfig;
    }

    if (!settings.codeGenSettings.entityWhitelist.entities?.length) {
        console.warn("The entity whitelist is empty. This will generate an empty OData client. Set the whitelist to null to add all entities")
        return {
            entitySets: {},
            types: {}
        }
    }

    const whitelisted = settings.codeGenSettings.entityWhitelist.entities
        .map(x => {
            const ns = x.lastIndexOf("/");
            return ns === -1
                ? { name: x, namesapce: "" }
                : { name: x.substring(ns + 1), namesapce: x.substring(0, ns) }
        })
        .map(x => (type: { name: string, namespace: string }) => x.name === type.name && x.namesapce === type.namespace)

    const anyWhitelisted: IsWhiteListed = (x) => {
        for (var i = 0; i < whitelisted.length; i++) {
            if (whitelisted[i](x)) return true
        }

        return false;
    }

    const deepWhitelist: IsWhiteListed = (x) => {

        if (x.namespace === "Edm") return true;

        const t = serviceConfig.types[x.namespace] && serviceConfig.types[x.namespace][x.name]
        if (!t) {
            return false
        }

        return shouldTakeType(t, anyWhitelisted)
    }

    serviceConfig = whitelistEntities(serviceConfig, deepWhitelist)
    serviceConfig = whitelistEntityContainers(serviceConfig, deepWhitelist)

    return serviceConfig

    function shouldTakeType(type: ComplexTypeOrEnum, whitelist: IsWhiteListed): boolean {

        if (type.containerType === "Enum") {
            return whitelist(type.type)
        }

        if (!whitelist(type.type)) {
            return false;
        }

        if (type.type.baseType) {
            const baseTypeRef: ODataSingleTypeRef = { isCollection: false, ...type.type.baseType }
            if (!shouldWhitelistTypeRef(baseTypeRef, whitelist)) {

                if (!settings.warningSettings?.suppressAll && !settings.warningSettings?.suppressIgnoredBaseType) {
                    const t = typeNameString(type.type, settings.codeGenSettings)
                    const tBase = typeNameString(type.type.baseType, settings.codeGenSettings)
                    warn(settings.warningSettings, "suppressIgnoredBaseType", `Type ${t} is not ignored, however it's parent type ${tBase} is. Ignoring ${t}.`)
                }

                return false;
            }
        }

        if (type.type.keyProps?.length) {
            for (var i = 0; i < type.type.keyProps.length; i++) {
                if (!shouldWhitelistTypeRef(type.type.properties[type.type.keyProps[i]].type, whitelist)) {

                    if (!settings.warningSettings?.suppressAll && !settings.warningSettings?.suppressIgnoredKeyType) {
                        const t = typeNameString(type.type, settings.codeGenSettings)
                        const k = unwrapTypeRef(type.type.properties[type.type.keyProps[i]].type)
                        const tKey = typeNameString(k, settings.codeGenSettings)

                        warn(settings.warningSettings, "suppressIgnoredKeyType", `Type ${t} is not ignored, however (part of) it's key type ${tKey} is. Ignoring ${t}`)
                    }

                    return false;
                }
            }
        }

        return true;
    }

    function shouldWhitelistTypeRef(type: ODataTypeRef, whiteList: IsWhiteListed): boolean {
        if (type.isCollection) {
            return shouldWhitelistTypeRef(type.collectionType, whiteList)
        }

        if (type.namespace === "Edm") return true;

        const t = serviceConfig.types[type.namespace] && serviceConfig.types[type.namespace][type.name]
        if (!t) {
            return false
        }

        return shouldTakeType(t, whiteList)
    }

    function unwrapTypeRef(type: ODataTypeRef): ODataSingleTypeRef {
        if (type.isCollection) {
            return unwrapTypeRef(type.collectionType)
        }

        return type
    }
}

function whitelistEntityContainers(serviceConfig: ODataServiceConfig, whiteList: IsWhiteListed): ODataServiceConfig {
    const roughRemoval: ODataServiceConfig = {
        ...serviceConfig,
        entitySets: Object
            .keys(serviceConfig.entitySets)
            .reduce((acc, containerName) => ({
                ...acc,
                [containerName]: Object
                    .keys(serviceConfig.entitySets[containerName])
                    .reduce((acc2, entitySetName) => !whiteList(serviceConfig.entitySets[containerName][entitySetName].forType)
                        ? acc2
                        : {
                            ...acc2,
                            [entitySetName]: serviceConfig.entitySets[containerName][entitySetName]
                        }, {} as ODataEntitySets)
            }), {} as ODataEntitySetNamespaces)
    }

    return {
        ...roughRemoval,
        entitySets: Object
            .keys(roughRemoval.entitySets)
            .reduce((acc, containerName) => !Object.keys(roughRemoval.entitySets[containerName]).length
                ? acc
                : {
                    ...acc,
                    [containerName]: roughRemoval.entitySets[containerName]
                }, {} as ODataEntitySetNamespaces)
    }
}

function whitelistEntities(serviceConfig: ODataServiceConfig, whiteList: IsWhiteListed): ODataServiceConfig {

    const roughRemoval = {
        ...serviceConfig,
        types: Object
            .keys(serviceConfig.types)
            .reduce((acc, ns) => ({
                ...acc,
                [ns]: Object
                    .keys(serviceConfig.types[ns])
                    .reduce((acc2, type) => !whiteList(serviceConfig.types[ns][type].type)
                        ? acc2
                        : ({
                            ...acc2,
                            [type]: rewriteType(serviceConfig.types[ns][type])
                        }), {} as { [key: string]: ComplexTypeOrEnum })
            }), {} as { [key: string]: { [key: string]: ComplexTypeOrEnum } })
    }

    return {
        ...roughRemoval,
        types: Object
            .keys(roughRemoval.types)
            .reduce((acc, containerName) => !Object.keys(roughRemoval.types[containerName]).length
                ? acc
                : {
                    ...acc,
                    [containerName]: roughRemoval.types[containerName]
                }, {} as { [key: string]: { [key: string]: ComplexTypeOrEnum } })
    }

    function shouldTakeTypeRef(type: ODataTypeRef): boolean {
        if (type.isCollection) {
            return shouldTakeTypeRef(type.collectionType)
        }

        return whiteList(type)
    }

    function rewriteType(type: ComplexTypeOrEnum): ComplexTypeOrEnum {
        if (type.containerType === "Enum") return type;

        return {
            ...type,
            type: {
                ...type.type,
                properties: Object
                    .keys(type.type.properties)
                    .reduce((s, x) => !shouldTakeTypeRef(type.type.properties[x].type)
                        ? s
                        : {
                            ...s,
                            [x]: type.type.properties[x]
                        }, {} as { [k: string]: ODataComplexTypeProperty })
            }
        }
    }
}