import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataEnum, ComplexTypeOrEnum } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { typeNameString } from "../utils.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetQueryableName, buildSanitizeNamespace, FullyQualifiedTsType, GetQueryableName, Tab } from "./utils.js";



function getQueryableTypeString(
    type: ODataTypeRef, wrapInQueryObject: boolean, keywords: Keywords, serviceConfig: ODataServiceConfig,
    fullyQualifiedTsType: FullyQualifiedTsType, getQueryableName: GetQueryableName): string {

    const t = getQueryableType(type, keywords, serviceConfig, fullyQualifiedTsType, getQueryableName);
    return wrapInQueryObject
        ? `${t.wrapper}<${t.generics.join(", ")}>`
        : t.generics[0];
}

function getQueryableType(type: ODataTypeRef, keywords: Keywords,
    serviceConfig: ODataServiceConfig, fullyQualifiedTsType: FullyQualifiedTsType, getQueryableName: GetQueryableName) {
    // TODO: namespacing of value from getTypeString?
    // TODO: test for QueryCollection<QueryCollection<T>>
    if (type.isCollection) {
        // TODO: type signature gets very long. Remove namespaces where possible
        return {
            wrapper: keywords.QueryCollection,
            generics: [
                getQueryableTypeString(type.collectionType, true, keywords, serviceConfig, fullyQualifiedTsType, getQueryableName),
                getQueryableTypeString(type.collectionType, false, keywords, serviceConfig, fullyQualifiedTsType, getQueryableName)
            ]
        };
    }

    if (type.namespace === "Edm") {
        return {
            wrapper: keywords.QueryPrimitive,
            generics: [`Edm.${type.name}`]
        };
    }

    if (!serviceConfig.types[type.namespace] || !serviceConfig.types[type.namespace][type.name]) {
        throw new Error(`Unknown type: ${typeNameString(type)}`);
    }

    const isEnum = serviceConfig.types[type.namespace][type.name].containerType === "Enum"
    const t = fullyQualifiedTsType(type, getQueryableName);

    return {
        wrapper: isEnum ? keywords.QueryEnum : keywords.QueryComplexObject,
        generics: [t]
    };
}

export type EntityQuery = (type: ComplexTypeOrEnum) => string
export const buildEntityQuery = (settings: CodeGenConfig | null | undefined, tab: Tab, keywords: Keywords, serviceConfig: ODataServiceConfig): EntityQuery => {

    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getQueryableName = buildGetQueryableName(settings);

    return (type: ComplexTypeOrEnum) => type.containerType === "ComplexType"
        ? complexType(type.type)
        : enumType(type.type);

    function complexType(type: ODataComplexType) {
        const qtName = getQueryableName(type.name)

        const baseTypeNs = type.baseType?.namespace ? `${sanitizeNamespace(type.baseType?.namespace)}.` : ""
        const baseQType = type.baseType ? `${baseTypeNs}${getQueryableName(type.baseType.name)} & ` : "";

        const queryableProps = Object
            .keys(type.properties)
            .map(key => ({
                key,
                type: getQueryableTypeString(type.properties[key].type, true, keywords, serviceConfig, fullyQualifiedTsType, getQueryableName)
            }))
            .map(prop => `${prop.key}: ${prop.type}`)
            .join("\n");

        return `export type ${qtName} = ${baseQType}{
${tab(queryableProps)}
}`

    }

    function enumType(type: ODataEnum) {
        const qtName = getQueryableName(type.name)
        return `export type ${qtName} = { /*TODO*/ }`
    }
}