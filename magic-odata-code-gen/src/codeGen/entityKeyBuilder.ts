import { ComplexTypeOrEnum, ODataComplexType, ODataEnum, ODataServiceConfig, ODataServiceTypes, ODataSingleTypeRef } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyType, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName, FullyQualifiedTsType, GetCasterName, GetKeyBuilderName, GetKeyType, GetQueryableName, GetSubPathName, httpClientType, Tab } from "./utils.js"

export type EntityCasting = (type: ODataComplexType) => string
export const buildEntityKeyBuilder = (tab: Tab, settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig,
    keywords: Keywords) => {

    const getCasterName = buildGetCasterName(settings);
    const getSubPathName = buildGetSubPathName(settings);
    const getQueryableName = buildGetQueryableName(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getKeyType = buildGetKeyType(settings, serviceConfig, keywords);


    return (type: ODataComplexType) => {
        const keyBuilderName = getKeyBuilderName(type.name)

        return `export type ${keyBuilderName} = {
${tab(`key(key: ${getKeyType(type, true)}, keyType?: ${keywords.WithKeyType}): ${getResultType(type)}`)}
}`
    }

    function getResultType(t: ODataComplexType) {

        const typeRef: ODataSingleTypeRef = { namespace: t.namespace, name: t.name, isCollection: false };
        const resultType = fullyQualifiedTsType(typeRef)
        const caster = fullyQualifiedTsType(typeRef, getCasterName)
        const subProps = fullyQualifiedTsType(typeRef, getSubPathName)

        const generics = {
            tEntity: resultType,
            tKeyBuilder: keywords.SingleItemsCannotBeQueriedByKey,
            tQueryable: fullyQualifiedTsType(typeRef, getQueryableName),
            tCaster: `${caster}.Single`,
            tSingleCaster: `${caster}.Single`,
            tSubPath: subProps,
            tSingleSubPath: subProps,
            tResult: {
                annotated: false,
                resultType: resultType
            }
        }

        const entityQueryType = httpClientType(keywords, generics, tab, settings || null);
        return `${keywords.KeySelection}<${entityQueryType}>`
    }
}