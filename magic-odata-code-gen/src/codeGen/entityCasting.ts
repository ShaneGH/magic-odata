import { ComplexTypeOrEnum, ODataComplexType, ODataEnum, ODataServiceConfig, ODataServiceTypes, ODataSingleTypeRef } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyType, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName, FullyQualifiedTsType, GetCasterName, GetKeyBuilderName, GetKeyType, GetQueryableName, GetSubPathName, httpClientType, Tab } from "./utils.js"

// TODO: duplicate_logic_key: caster
// TODO: this is a fairly heavy method to be called quite a bit. Optisation?
function buildGetComplexCasterProps(
    allTypes: ODataServiceTypes,
    fullyQualifiedTsType: FullyQualifiedTsType,
    getQueryableName: GetQueryableName,
    getCasterName: GetCasterName,
    getSubPathName: GetSubPathName,
    getKeyBuilderName: GetKeyBuilderName,
    keywords: Keywords,
    settings: CodeGenConfig | null,
    tab: Tab) {

    const allComplexTypeFlatList = Object
        .keys(allTypes)
        .map(ns => Object
            .keys(allTypes[ns])
            .map(t => allTypes[ns][t])
            .map(t => t.containerType === "ComplexType" ? t.type : null)
            .filter(x => !!x)
            .map(x => x!))
        .reduce((s, x) => [...s, ...x], [])

    return (type: ODataComplexType, annotatedResult: boolean, singleCasterType: boolean) => {

        const casterType = singleCasterType ? "Single" : "Collection"
        const complexInherits = allComplexTypeFlatList
            .filter(x => x.baseType
                && x.baseType.namespace === type.namespace
                && x.baseType.name === type.name);

        const distinctNames = Object.keys(complexInherits
            .reduce((s, x) => ({ ...s, [x.name]: true }), {} as { [key: string]: boolean }))

        const name = complexInherits.length === distinctNames.length
            ? (x: ODataComplexType) => x.name
            // TODO: test
            // TODO: this logic will be duplicated in the code gen project. Possible to merge?
            : (x: ODataComplexType) => `${x.namespace}/${x.name}`.replace(/[^\w]/g, "_")

        return complexInherits
            .map(t => {
                const typeRef: ODataSingleTypeRef = { namespace: t.namespace, name: t.name, isCollection: false };
                const resultType = fullyQualifiedTsType(typeRef)
                const caster = fullyQualifiedTsType(typeRef, getCasterName)
                const subProps = fullyQualifiedTsType(typeRef, getSubPathName)
                const keyProp = fullyQualifiedTsType(typeRef, getKeyBuilderName);

                const generics = {
                    tEntity: resultType,
                    tKeyBuilder: keyProp,
                    tQueryable: fullyQualifiedTsType(typeRef, getQueryableName),
                    tCaster: `${caster}.${casterType}`,
                    tSingleCaster: `${caster}.Single`,
                    tSubPath: singleCasterType ? `${subProps}` : keywords.CollectionsCannotBeTraversed,
                    tSingleSubPath: singleCasterType ? keywords.CollectionsCannotBeTraversed : `${subProps}`,
                    tResult: {
                        annotated: annotatedResult,
                        resultType: resultType + (singleCasterType ? "" : "[]")
                    }
                }

                const entityQueryType = httpClientType(keywords, generics, tab, settings || null);
                return `${name(t)}(): ${keywords.CastSelection}<${entityQueryType}>`
            })
    }
}

export type EntityCasting = (type: ComplexTypeOrEnum) => string
export const buildEntityCasting = (tab: Tab, settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig,
    keywords: Keywords) => {

    const getCasterName = buildGetCasterName(settings);
    const getSubPathName = buildGetSubPathName(settings);
    const getQueryableName = buildGetQueryableName(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getComplexCasterProps = buildGetComplexCasterProps(serviceConfig.types,
        fullyQualifiedTsType, getQueryableName, getCasterName, getSubPathName, getKeyBuilderName,
        keywords, settings || null, tab);

    return (type: ComplexTypeOrEnum) => type.containerType === "ComplexType"
        ? complexType(type.type)
        : enumType(type.type);

    function complexType(type: ODataComplexType) {
        const casterName = getCasterName(type.name)

        return `export module ${casterName} {
${tab(single(type))}

${tab(collection(type))}
}`
    }

    function enumType(type: ODataEnum) {
        const casterName = getCasterName(type.name)

        return `export module ${casterName} { /* TODO */ }`
    }

    function single(type: ODataComplexType) {
        const props = getComplexCasterProps(type, false, true)
        return !props.length
            ? "export type Single = { }"
            : `export type Single = {
${tab(props.join("\n\n"))}
}`;
    }

    function collection(type: ODataComplexType) {
        const props = getComplexCasterProps(type, true, false)
        return !props.length
            ? "export type Collection = { }"
            : `export type Collection = {
${tab(props.join("\n\n"))}
}`;

    }
}