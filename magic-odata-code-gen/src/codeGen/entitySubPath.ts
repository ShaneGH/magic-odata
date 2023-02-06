import { ODataComplexType, ODataTypeRef, ODataServiceConfig, ODataServiceTypes, ODataSingleTypeRef, ODataEnum } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { Keywords } from "./keywords.js";
import { buildFullyQualifiedTsType, buildGetCasterName, buildGetKeyBuilderName, buildGetKeyType, buildGetQueryableName, buildGetSubPathName, buildSanitizeNamespace, FullyQualifiedTsType, GetCasterName, GetKeyBuilderName, GetKeyType, GetQueryableName, GetSubPathName, httpClientType, Tab } from "./utils.js"

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

// TODO: allow multiple paths in a single call... e.g. x => x.BlogPost.Blog.User
function buildGetSubPathProps(
    allTypes: ODataServiceTypes,
    fullyQualifiedTsType: FullyQualifiedTsType,
    getQueryableName: GetQueryableName,
    getCasterName: GetCasterName,
    getSubPathName: GetSubPathName,
    getKeyBuilderName: GetKeyBuilderName,
    keywords: Keywords,
    settings: CodeGenConfig | null,
    tab: Tab) {

    return (type: ODataComplexType): string[] => {

        return Object
            .keys(type.properties)
            .map(key => [key, type.properties[key].type] as [string, ODataTypeRef])
            .map(([key, value]) => {

                // TODO: test with arrays of arrays?

                const entityInfo = getEntityTypeInfo(value)
                const tEntity = typeName(entityInfo, 1)

                const generics = {
                    tEntity,
                    tKeyBuilder: getTKeyBuilder(entityInfo),
                    tQueryable: getTQuery(entityInfo),
                    tCaster: getTCaster(entityInfo),
                    tSingleCaster: getTCaster(entityInfo, true),
                    tSubPath: entityInfo.collectionDepth ? keywords.CollectionsCannotBeTraversed : getTSubPath(entityInfo, false),
                    tSingleSubPath: entityInfo.collectionDepth ? getTSubPath(entityInfo, true) : keywords.CollectionsCannotBeTraversed,
                    tResult: {
                        annotated: entityInfo.type.objectType !== ObjectType.ComplexType || !!entityInfo.collectionDepth,
                        resultType: tEntity + (entityInfo.collectionDepth ? "[]" : "")
                    }
                }

                const entityQueryType = httpClientType(keywords, generics, tab, settings || null);
                return `${key}: ${keywords.SubPathSelection}<${entityQueryType}>`
            })
    }

    function getTSubPath(info: EntityTypeInfo, single: boolean) {

        // TODO: is is possible to cast a primitive? (e.g. int -> string)
        if (info.type.objectType !== ObjectType.ComplexType) {
            return keywords.PrimitiveTypesCannotBeTraversed;
        }

        if (info.collectionDepth > 1 || (info.collectionDepth && !single)) {
            return keywords.CollectionsCannotBeTraversed;
        }

        return fullyQualifiedTsType({
            isCollection: false,
            namespace: info.type.complexType.namespace,
            name: info.type.complexType.name
        }, getSubPathName)
    }

    function getTCaster(info: EntityTypeInfo, forceSingle = false) {

        // TODO: is is possible to cast a primitive? (e.g. int -> string)
        if (info.type.objectType !== ObjectType.ComplexType || info.collectionDepth > 1) {
            return keywords.CastingOnCollectionsOfCollectionsIsNotSupported;
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
            return `QueryPrimitive<${info.type.primitiveType.namespace && `${info.type.primitiveType.namespace}.`}${info.type.primitiveType.name}>`
        }

        if (info.type.objectType === ObjectType.EnumType) {
            return `QueryEnum<${info.type.enumType.namespace && `${info.type.enumType.namespace}.`}${info.type.enumType.name}>`
        }

        return fullyQualifiedTsType({
            isCollection: false,
            namespace: info.type.complexType.namespace,
            name: info.type.complexType.name
        }, getQueryableName)
    }

    function typeName(info: EntityTypeInfo, unwrapCollections = 0) {
        const collectionStr = [...Array(Math.max(0, info.collectionDepth - unwrapCollections)).keys()]
            .map(_ => "[]")
            .join("")

        const resultStr = info.type.objectType === ObjectType.PrimitiveType
            ? fullyQualifiedTsType(info.type.primitiveType)
            : info.type.objectType === ObjectType.EnumType
                ? fullyQualifiedTsType({
                    isCollection: false,
                    namespace: info.type.enumType.namespace,
                    name: info.type.enumType.name
                })
                : fullyQualifiedTsType({
                    isCollection: false,
                    namespace: info.type.complexType.namespace,
                    name: info.type.complexType.name
                });

        return resultStr + collectionStr
    }

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

        const type = allTypes[propertyType.namespace] && allTypes[propertyType.namespace][propertyType.name]
        if (!type) {
            const ns = propertyType.namespace && `${propertyType.namespace}.`
            throw new Error(`Could not find key for type ${ns}${propertyType.name}`);
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

export type EntityCasting = (type: ODataComplexType) => string
export const buildEntitySubPath = (tab: Tab, settings: CodeGenConfig | null | undefined, serviceConfig: ODataServiceConfig,
    keywords: Keywords) => {

    const sanitizeNamespace = buildSanitizeNamespace(settings);
    const getCasterName = buildGetCasterName(settings);
    const getSubPathName = buildGetSubPathName(settings);
    const fullyQualifiedTsType = buildFullyQualifiedTsType(settings);
    const getKeyBuilderName = buildGetKeyBuilderName(settings);
    const getQueryableName = buildGetQueryableName(settings);
    const getSubPathProps = buildGetSubPathProps(serviceConfig.types, fullyQualifiedTsType, getQueryableName,
        getCasterName, getSubPathName, getKeyBuilderName, keywords, settings || null, tab);

    return (type: ODataComplexType) => {
        const subPathName = getSubPathName(type.name)
        const baseTypeNs = type.baseType?.namespace ? `${sanitizeNamespace(type.baseType?.namespace)}.` : ""
        const fullyQualifiedBaseTypeName = type.baseType ? `${baseTypeNs}${getSubPathName(type.baseType.name)}` : null;
        const baseType = (fullyQualifiedBaseTypeName || "") && `${fullyQualifiedBaseTypeName} & `
        const props = getSubPathProps(type)

        return `export type ${subPathName} = ${baseType}{
${tab(props.join("\n\n"))}
}`;
    }
}