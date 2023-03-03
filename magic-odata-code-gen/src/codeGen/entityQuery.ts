import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataEnum, ComplexTypeOrEnum } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { typeNameString } from "../utils.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetQueryableName, buildSanitizeNamespace, FullyQualifiedTsType, GetQueryableName, Tab } from "./utils.js";

function getQueryableTypeString(
    type: ODataTypeRef, wrapInQueryObject: boolean, keywords: Keywords, serviceConfig: ODataServiceConfig,
    settings: CodeGenConfig | null | undefined, fullyQualifiedTsType: FullyQualifiedTsType, getQueryableName: GetQueryableName): string {

    const t = getQueryableType(type, keywords, settings, serviceConfig, fullyQualifiedTsType, getQueryableName);
    return wrapInQueryObject
        ? `${t.wrapper}<${t.generics.join(", ")}>`
        : t.generics[0];
}

function getQueryableType(type: ODataTypeRef, keywords: Keywords, settings: CodeGenConfig | null | undefined,
    serviceConfig: ODataServiceConfig, fullyQualifiedTsType: FullyQualifiedTsType, getQueryableName: GetQueryableName) {
    // TODO: test for QueryCollection<QueryCollection<T>>
    if (type.isCollection) {
        return {
            wrapper: keywords.QueryCollection,
            generics: [
                getQueryableTypeString(type.collectionType, true, keywords, serviceConfig, settings, fullyQualifiedTsType, getQueryableName),
                getQueryableTypeString(type.collectionType, false, keywords, serviceConfig, settings, fullyQualifiedTsType, getQueryableName)
            ]
        };
    }

    if (type.namespace === "Edm") {
        return {
            wrapper: keywords.QueryPrimitive,
            generics: [`Edm.${type.name}`]
        };
    }

    if (!serviceConfig.schemaNamespaces[type.namespace] || !serviceConfig.schemaNamespaces[type.namespace].types[type.name]) {
        throw new Error(`Unknown type: ${typeNameString(type, settings)}`);
    }

    if (serviceConfig.schemaNamespaces[type.namespace].types[type.name].containerType === "Enum") {
        const tEnum = fullyQualifiedTsType(type);
        return {
            wrapper: keywords.QueryEnum,
            generics: [tEnum]
        };
    }

    const t = fullyQualifiedTsType(type, getQueryableName);
    return {
        wrapper: keywords.QueryComplexObject,
        generics: [t]
    };
}

export type EntityQuery = (type: ComplexTypeOrEnum) => string | null
export const buildEntityQuery = (settings: CodeGenConfig | null | undefined, tab: Tab, keywords: Keywords, serviceConfig: ODataServiceConfig): EntityQuery => {

    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getQueryableName = buildGetQueryableName(settings);

    return (type: ComplexTypeOrEnum) => type.containerType === "ComplexType"
        ? complexType(type.type)
        : null;

    function complexType(type: ODataComplexType) {
        const qtName = getQueryableName(type.name)

        const baseTypeNs = type.baseType?.namespace ? `${sanitizeNamespace(type.baseType?.namespace)}.` : ""
        const baseQType = type.baseType ? `${baseTypeNs}${getQueryableName(type.baseType.name)} & ` : "";

        const queryableProps = Object
            .keys(type.properties)
            .map(key => ({
                key,
                type: getQueryableTypeString(type.properties[key].type, true, keywords, serviceConfig, settings, fullyQualifiedTsType, getQueryableName)
            }))
            .map(prop => `${prop.key}: ${prop.type}`)
            .join("\n");

        return `export type ${qtName} = ${baseQType}{
${tab(queryableProps)}
}`
    }
}