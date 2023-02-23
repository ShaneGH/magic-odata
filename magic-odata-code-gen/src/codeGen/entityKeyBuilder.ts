import { ODataComplexType, ODataServiceConfig, ODataSingleTypeRef } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyType, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName, buildHttpClientType, Tab } from "./utils.js"

export type EntityCasting = (type: ODataComplexType) => string
export const buildEntityKeyBuilder = (tab: Tab, settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig,
    keywords: Keywords) => {

    const getCasterName = buildGetCasterName(settings);
    const getSubPathName = buildGetSubPathName(settings);
    const getQueryableName = buildGetQueryableName(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getKeyType = buildGetKeyType(settings, serviceConfig, keywords);
    const httpClientType = buildHttpClientType(serviceConfig.types, keywords, tab, settings || null);

    return (type: ODataComplexType) => {
        const keyBuilderName = getKeyBuilderName(type.name)

        return `export type ${keyBuilderName} = {
${tab(`key(key: ${getKeyType(type, true)}, keyType?: ${keywords.WithKeyType}): ${getResultType(type)}

keyRaw(key: string): ${getResultType(type)}`)}
}`
    }

    function getResultType(t: ODataComplexType) {

        const typeRef: ODataSingleTypeRef = { namespace: t.namespace, name: t.name, isCollection: false };
        const caster = fullyQualifiedTsType(typeRef, getCasterName)
        const subProps = fullyQualifiedTsType(typeRef, getSubPathName)

        const generics = {
            tKeyBuilder: keywords.SingleItemsCannotBeQueriedByKey,
            tQueryable: fullyQualifiedTsType(typeRef, getQueryableName),
            tCaster: `${caster}.Single`,
            tSubPath: subProps,
            tResult: typeRef
        }

        const entityQueryType = httpClientType(generics, true);
        return `${keywords.KeySelection}<${entityQueryType}>`
    }
}