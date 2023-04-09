import { ComplexTypeOrEnum, Dict, ODataComplexType, ODataSchema, ODataServiceConfig, ODataSingleTypeRef } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import {
    buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName,
    buildGetSubPathName, FullyQualifiedTsType, GetCasterName, GetKeyBuilderName, GetQueryableName,
    GetSubPathName, buildHttpClientType, Tab, HttpClientType, entitySetsName, getFetchResult
} from "./utils.js"

// https://github.com/ShaneGH/magic-odata/issues/4
function buildGetComplexCasterProps(
    settings: CodeGenConfig | null | undefined,
    allTypes: Dict<ODataSchema>,
    fullyQualifiedTsType: FullyQualifiedTsType,
    getQueryableName: GetQueryableName,
    getCasterName: GetCasterName,
    getSubPathName: GetSubPathName,
    getKeyBuilderName: GetKeyBuilderName,
    httpClientType: HttpClientType,
    keywords: Keywords) {

    const allComplexTypeFlatList = Object
        .keys(allTypes)
        .map(ns => Object
            .keys(allTypes[ns].types)
            .map(t => allTypes[ns].types[t])
            .map(t => t.containerType === "ComplexType" ? t.type : null)
            .filter(x => !!x)
            .map(x => x!))
        .reduce((s, x) => [...s, ...x], [])

    return (type: ODataComplexType, isCollection: boolean) => {

        const casterType = isCollection ? "Collection" : "Single"
        const complexInherits = allComplexTypeFlatList
            .filter(x => (x.baseType
                && x.baseType.namespace === type.namespace
                && x.baseType.name === type.name)
                || (x.namespace === type.namespace
                    && x.name === type.name));

        const distinctNames = Object.keys(complexInherits
            .reduce((s, x) => ({ ...s, [x.name]: true }), {} as { [key: string]: boolean }))

        const name = complexInherits.length === distinctNames.length
            ? (x: ODataComplexType) => x.name
            : (x: ODataComplexType) => `${x.namespace}/${x.name}`.replace(/[^\w]/g, "_")

        return complexInherits
            .map(t => {
                const typeRef: ODataSingleTypeRef = { namespace: t.namespace, name: t.name, isCollection: false };
                const caster = fullyQualifiedTsType(typeRef, getCasterName)
                const subProps = fullyQualifiedTsType(typeRef, getSubPathName)
                const keyProp = fullyQualifiedTsType(typeRef, getKeyBuilderName);
                const tQueryable = fullyQualifiedTsType(typeRef, getQueryableName)
                const { async, fetchResponse } = getFetchResult(keywords, settings || null)

                const singleGenerics = {
                    tKeyBuilder: keyProp,
                    tQueryable,
                    tCaster: `${caster}.${casterType}`,
                    tSubPath: subProps,
                    tResult: typeRef
                }

                let entityQueryType = httpClientType(singleGenerics, true, isCollection ? " (element)" : undefined);
                if (isCollection) {
                    const generics = {
                        tKeyBuilder: keyProp,
                        tQueryable,
                        tCaster: `${caster}.${casterType}`,
                        tSubPath: isCollection
                            ? `${keywords.CollectionSubPath}<${entitySetsName(settings)}, ${async}<number>, ${tQueryable}, ${async}<${fetchResponse}>, ${entityQueryType}>`
                            : subProps,
                        tResult: isCollection
                            ? { isCollection: true as const, collectionType: typeRef }
                            : typeRef
                    }

                    entityQueryType = httpClientType(generics, true);
                }

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
    const httpClientType = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, settings || null);
    const getComplexCasterProps = buildGetComplexCasterProps(settings, serviceConfig.schemaNamespaces,
        fullyQualifiedTsType, getQueryableName, getCasterName, getSubPathName, getKeyBuilderName,
        httpClientType, keywords);

    return (type: ComplexTypeOrEnum) => type.containerType === "ComplexType"
        ? complexType(type.type)
        : null; // https://github.com/ShaneGH/magic-odata/issues/12

    function complexType(type: ODataComplexType) {
        const casterName = getCasterName(type.name)

        return `export module ${casterName} {
${tab(single(type))}

${tab(collection(type))}
}`
    }

    function single(type: ODataComplexType) {
        const props = getComplexCasterProps(type, false)
        return !props.length
            ? "export type Single = { }"
            : `export type Single = {
${tab(props.join("\n\n"))}
}`;
    }

    function collection(type: ODataComplexType) {
        const props = getComplexCasterProps(type, true)
        return !props.length
            ? "export type Collection = { }"
            : `export type Collection = {
${tab(props.join("\n\n"))}
}`;

    }
}