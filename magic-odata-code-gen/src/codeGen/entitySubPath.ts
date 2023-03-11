import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataSingleTypeRef, ODataEnum, Dict, ODataSchema } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { typeNameString } from "../utils.js";
import { buildGetEntityFunctionsName, entitySetsName } from "../codeGen/utils.js";
import { Keywords } from "./keywords.js";
import {
    buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetQueryableName, buildGetSubPathName,
    buildSanitizeNamespace, FullyQualifiedTsType, GetCasterName, GetKeyBuilderName, GetQueryableName, GetSubPathName,
    buildHttpClientType, Tab, HttpClientType, getFetchResult
} from "./utils.js"

// TODO: duplicate_logic_key: subPath
enum ObjectType {
    ComplexType = "ComplexType",
    PrimitiveType = "PrimitiveType",
    EnumType = "EnumType"
}

type IsObjectDescription<T extends ObjectType> = {
    objectType: T
}

type IsComplexType = IsObjectDescription<ObjectType.ComplexType> & {
    complexType: ODataComplexType
}

type IsPrimitiveType = IsObjectDescription<ObjectType.PrimitiveType> & {
    primitiveType: ODataSingleTypeRef
}

type IsEnumType = IsObjectDescription<ObjectType.EnumType> & {
    enumType: ODataEnum
}

type EntityTypeInfo = {
    // the number of collection in this type info. e.g. MyType[][][] === 3
    collectionDepth: number
    type: IsComplexType | IsPrimitiveType | IsEnumType
}

export type GetTypeForSubPath = (t: ODataTypeRef, isNullable?: boolean) => string
export function buildGetTypeForSubPath(
    allTypes: Dict<ODataSchema>,
    fullyQualifiedTsType: FullyQualifiedTsType,
    getQueryableName: GetQueryableName,
    getCasterName: GetCasterName,
    getSubPathName: GetSubPathName,
    getKeyBuilderName: GetKeyBuilderName,
    keywords: Keywords,
    httpClientType: HttpClientType,
    settings: CodeGenConfig | null): GetTypeForSubPath {

    return (t, isNullable) => {
        // TODO: test with arrays of arrays?

        const entityInfo = getEntityTypeInfo(t)
        const tQueryable = getTQuery(entityInfo)

        const generics = {
            tKeyBuilder: getTKeyBuilder(entityInfo),
            tQueryable,
            tCaster: getTCaster(entityInfo),
            tSubPath: getTSubPath(t, tQueryable),
            tResult: t,
            tResultNullable: isNullable
        }

        const entityQueryType = httpClientType(generics, true);
        return `${keywords.SubPathSelection}<${entityQueryType}>`
    }

    function getTSubPath(typeRef: ODataTypeRef, tQueryable: string) {

        if (typeRef.isCollection) {
            const { async, fetchResponse } = getFetchResult(keywords, settings || null)
            return `${keywords.CollectionSubPath}<${entitySetsName(settings)}, ${async}<number>, ${tQueryable}, ${async}<${fetchResponse}>>`;
        }

        // https://github.com/ShaneGH/magic-odata/issues/12
        if (typeRef.namespace === "Edm") {
            const { async, fetchResponse } = getFetchResult(keywords, settings || null)
            return `${keywords.PrimitiveSubPath}<${entitySetsName(settings)}, ${async}<string>, ${tQueryable}, ${async}<${fetchResponse}>>`;
        }

        const type = allTypes[typeRef.namespace] && allTypes[typeRef.namespace].types[typeRef.name]
        if (!type) {
            throw new Error(`Could not find key for type ${typeNameString(typeRef, settings)}`);
        }

        // https://github.com/ShaneGH/magic-odata/issues/12
        if (type.containerType === "Enum") {
            const { async, fetchResponse } = getFetchResult(keywords, settings || null)
            return `${keywords.PrimitiveSubPath}<${entitySetsName(settings)}, ${async}<string>, ${tQueryable}, ${async}<${fetchResponse}>>`;
        }

        return fullyQualifiedTsType(typeRef, getSubPathName)
    }

    function getTCaster(info: EntityTypeInfo, forceSingle = false) {

        // https://github.com/ShaneGH/magic-odata/issues/12
        if (info.collectionDepth > 1) {
            return keywords.CastingOnCollectionsOfCollectionsIsNotSupported;
        }

        if (info.type.objectType !== ObjectType.ComplexType) {
            return keywords.CastingOnEnumsAndPrimitivesIsNotSupported;
        }

        const caster = fullyQualifiedTsType({
            isCollection: false,
            namespace: info.type.complexType.namespace,
            name: info.type.complexType.name
        }, getCasterName)

        return forceSingle || !info.collectionDepth
            ? `${caster}.Single`
            : `${caster}.Collection`
    }

    function getTKeyBuilder(info: EntityTypeInfo) {

        if (info.collectionDepth !== 1) {
            return info.collectionDepth > 1 || info.type.objectType !== ObjectType.ComplexType
                ? keywords.ThisItemDoesNotHaveAKey
                : keywords.SingleItemsCannotBeQueriedByKey
        }

        if (info.type.objectType !== ObjectType.ComplexType) {
            return keywords.ThisItemDoesNotHaveAKey;
        }

        return fullyQualifiedTsType({
            isCollection: false,
            namespace: info.type.complexType.namespace,
            name: info.type.complexType.name
        }, getKeyBuilderName);
    }

    function getTQuery(info: EntityTypeInfo) {

        if (info.collectionDepth > 1) {
            return keywords.QueryingOnCollectionsOfCollectionsIsNotSupported
        }

        if (info.type.objectType === ObjectType.PrimitiveType) {
            return `QueryPrimitive<${typeNameString(info.type.primitiveType, settings, ".")}>`
        }

        if (info.type.objectType === ObjectType.EnumType) {
            return `QueryEnum<${typeNameString(info.type.enumType, settings, ".")}>`
        }

        return fullyQualifiedTsType({
            isCollection: false,
            namespace: info.type.complexType.namespace,
            name: info.type.complexType.name
        }, getQueryableName)
    }

    // TODO: this is a messy abstraction. Remove if possible
    // Might be entwined with TEntity on EntitySet. TEntity is never an array, even though maybe it should be
    function getEntityTypeInfo(propertyType: ODataTypeRef): EntityTypeInfo {
        if (propertyType.isCollection) {
            const innerResult = getEntityTypeInfo(propertyType.collectionType)
            return {
                ...innerResult,
                collectionDepth: innerResult.collectionDepth + 1
            }
        }

        if (propertyType.namespace === "Edm") {
            return {
                collectionDepth: 0,
                type: {
                    objectType: ObjectType.PrimitiveType,
                    primitiveType: propertyType
                }
            };
        }

        const type = allTypes[propertyType.namespace] && allTypes[propertyType.namespace].types[propertyType.name]
        if (!type) {
            throw new Error(`Could not find key for type ${typeNameString(propertyType, settings)}`);
        }

        if (type.containerType === "ComplexType") {
            return {
                collectionDepth: 0,
                type: {
                    objectType: ObjectType.ComplexType,
                    complexType: type.type
                }
            };
        }

        return {
            collectionDepth: 0,
            type: {
                objectType: ObjectType.EnumType,
                enumType: type.type
            }
        };
    }
}

function buildGetSubPathProps(
    allTypes: Dict<ODataSchema>,
    fullyQualifiedTsType: FullyQualifiedTsType,
    getQueryableName: GetQueryableName,
    getCasterName: GetCasterName,
    getSubPathName: GetSubPathName,
    getKeyBuilderName: GetKeyBuilderName,
    keywords: Keywords,
    httpClientType: HttpClientType,
    settings: CodeGenConfig | null) {

    const getTypeForSubPath = buildGetTypeForSubPath(
        allTypes,
        fullyQualifiedTsType,
        getQueryableName,
        getCasterName,
        getSubPathName,
        getKeyBuilderName,
        keywords,
        httpClientType,
        settings);

    return (type: ODataComplexType): string[] => {

        return Object
            .keys(type.properties)
            .map(key => [key, type.properties[key].type] as [string, ODataTypeRef])
            .map(([key, value]) => `${key}: ${getTypeForSubPath(value)}`)
    }
}

export type EntityCasting = (type: ODataComplexType) => string
export const buildEntitySubPath = (tab: Tab, settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig,
    keywords: Keywords) => {

    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const getCasterName = buildGetCasterName(settings);
    const getSubPathName = buildGetSubPathName(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const getQueryableName = buildGetQueryableName(settings);
    const functionsType = buildGetEntityFunctionsName(settings)
    const httpClientType = buildHttpClientType(serviceConfig.schemaNamespaces, keywords, tab, settings || null);
    const getSubPathProps = buildGetSubPathProps(serviceConfig.schemaNamespaces, fullyQualifiedTsType, getQueryableName,
        getCasterName, getSubPathName, getKeyBuilderName, keywords, httpClientType, settings || null);

    return (type: ODataComplexType) => {
        const subPathName = getSubPathName(type.name)
        const baseTypeNs = type.baseType?.namespace ? `${sanitizeNamespace(type.baseType?.namespace)}.` : ""
        const fullyQualifiedBaseTypeName = type.baseType ? `${baseTypeNs}${getSubPathName(type.baseType.name)}` : null;
        const baseType = (fullyQualifiedBaseTypeName || "") && `${fullyQualifiedBaseTypeName} & `
        const props = getSubPathProps(type)

        return `export type ${subPathName} = ${baseType}${functionsType(type.name)} & {
${tab(props.join("\n\n"))}
}`;
    }
}