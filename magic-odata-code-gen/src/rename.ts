import { ComplexTypeOrEnum, ODataComplexTypeProperty, ODataEntitySetNamespaces, ODataEntitySets, ODataServiceConfig, ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";
import { Config } from "./config.js";

export function applyRenames(serviceConfig: ODataServiceConfig, settings: Config): ODataServiceConfig {

    serviceConfig = renameEntities(serviceConfig, settings.codeGenSettings?.rename?.entityNamespaces || null)
    serviceConfig = renameEntityContainers(serviceConfig,
        settings.codeGenSettings?.rename?.entityContainers || null,
        settings.codeGenSettings?.rename?.entityNamespaces || null)

    return serviceConfig
}

function renameEntityContainers(serviceConfig: ODataServiceConfig, containerRenames: { [key: string]: string } | null, entityRenames: { [key: string]: string } | null): ODataServiceConfig {
    if (!containerRenames && !entityRenames) {

        return serviceConfig
    }

    const crn = containerRenames || {};
    const ern = entityRenames || {};
    return {
        ...serviceConfig,
        entitySets: Object
            .keys(serviceConfig.entitySets)
            .reduce((s, x) => ({
                ...s,
                [reNamespaceEntitySet(x)]: reNamespaceANamespace(serviceConfig.entitySets[x])
            }), {} as ODataEntitySetNamespaces)
    }

    function reNamespaceEntity(ns: string) {

        return ern[ns] == null ? ns : (ern[ns] || "");
    }

    function reNamespaceEntitySet(ns: string, printEntitySetName?: string) {

        if (crn[ns] == null) {
            return ns;
        }

        if (printEntitySetName) {
            console.log(`Renaming entity set: ${ns && `${ns}/`}${printEntitySetName} => ${crn[ns] && `${crn[ns]}/`}${printEntitySetName}`);
        }

        return crn[ns] || "";
    }

    function reNamespaceANamespace(ns: ODataEntitySets): ODataEntitySets {
        return Object
            .keys(ns)
            .reduce((s, x) => ({
                ...s,
                [x]: {
                    ...ns[x],
                    namespace: reNamespaceEntitySet(ns[x].namespace, x),
                    forType: {
                        ...ns[x].forType,
                        namespace: reNamespaceEntity(ns[x].forType.namespace)
                    }
                }
            }), {} as ODataEntitySets)
    }
}

type TypeNs = { [typeName: string]: ComplexTypeOrEnum }
function renameEntities(serviceConfig: ODataServiceConfig, renames: { [key: string]: string } | null): ODataServiceConfig {
    if (!renames) {

        return serviceConfig
    }

    const rn = renames;
    return {
        ...serviceConfig,
        types: Object
            .keys(serviceConfig.types)
            .reduce((s, x) => ({
                ...s,
                [reNamespaceKey(x)]: reNamespaceANamespace(serviceConfig.types[x])
            }), {} as ODataServiceTypes)
    }

    function reNamespaceKey(ns: string, printEntitySetName?: string) {

        if (rn[ns] == null) {
            return ns;
        }

        if (printEntitySetName) {
            console.log(`Renaming entity: ${ns && `${ns}/`}${printEntitySetName} => ${rn[ns] && `${rn[ns]}/`}${printEntitySetName}`);
        }

        return rn[ns] || "";
    }

    function renamespaceTypeRef(typeRef: ODataTypeRef): ODataTypeRef {
        if (typeRef.isCollection) {
            return {
                isCollection: true,
                collectionType: renamespaceTypeRef(typeRef.collectionType)
            }
        }

        return {
            ...typeRef,
            namespace: reNamespaceKey(typeRef.namespace)
        }
    }

    function reNamespaceVal(t: ComplexTypeOrEnum): ComplexTypeOrEnum {
        if (t.containerType === "ComplexType") {
            return {
                ...t,
                type: {
                    ...t.type,
                    namespace: reNamespaceKey(t.type.namespace, t.type.name),
                    baseType: t.type.baseType && {
                        ...t.type.baseType,
                        namespace: reNamespaceKey(t.type.baseType.namespace)
                    },
                    properties: Object
                        .keys(t.type.properties)
                        .reduce((s, x) => ({
                            ...s,
                            [x]: {
                                ...t.type.properties[x],
                                type: renamespaceTypeRef(t.type.properties[x].type)
                            }
                        }), {} as { [key: string]: ODataComplexTypeProperty })
                }
            }
        }

        return {
            ...t,
            type: {
                ...t.type,
                namespace: reNamespaceKey(t.type.namespace)
            }
        }
    }

    function reNamespaceANamespace(ns: TypeNs): TypeNs {
        return Object
            .keys(ns)
            .reduce((s, x) => ({
                ...s,
                [x]: reNamespaceVal(ns[x])
            }), {} as TypeNs)
    }

}