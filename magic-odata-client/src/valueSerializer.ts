import { ODataEnum, ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";

export function enumMemberName(enumDef: ODataEnum, value: number): string {
    const name = Object
        .keys(enumDef.members)
        .filter(k => enumDef.members[k] === value);

    if (!name.length) {
        throw new Error(`Cannot find name of enum for value: ${value}. Use the mapper arg to specify a custom value`);
    } else if (name.length > 1) {
        console.warn(`Found multiple members for enum value: ${value}`);
    }

    return name[0]
}

export function stringSerialize(value: string): string {
    return `'${value.replace(/'/g, "''")}'`
}

export function basicSerialize(value: any): string {
    return typeof value === "string"
        ? stringSerialize(value)
        : value.toString();
}

export function serialize(value: any, type?: ODataTypeRef, serviceConfig?: ODataServiceTypes): string {
    if (value == null) {
        return "null"
    }

    if (Array.isArray(value)) {
        type = type?.isCollection ? type.collectionType : type
        return `[${value.map(x => serialize(x, type, serviceConfig))}]`
    }

    if (type?.isCollection) {
        // TODO: disable warnings
        console.warn(`Collection type found when serializing non collection for filter. `
            + `Ignoring type info. This may lead to incorrect serializaton of values in filtering`, type);
        type = undefined;
    }

    if (!type) {
        return basicSerialize(value);
    }

    if (type.namespace === "Edm") {
        // TODO: test each
        switch (type.name) {
            case "String":
            case "Boolean":
            case "Int16":
            case "Int32":
            case "Int64":
            case "Decimal":
            case "Double":
            case "Single": return basicSerialize(value);
            case "Guid": return value.toString()
            default:
                console.warn(`Unknown type found when serializing value for filter. `
                    + `Ignoring type info. This may lead to incorrect serializaton of values in filtering`, type);
                return basicSerialize(value);
        }
    }

    if (!serviceConfig) {
        return basicSerialize(value);
    }

    const enumType = serviceConfig[type.namespace] && serviceConfig[type.namespace][type.name]
    if (enumType.containerType !== "Enum") {
        // TODO: disable warnings
        console.warn(`Complex type found when serializing value for filter. `
            + `Ignoring type info. This may lead to incorrect serializaton of values in filtering`, type);
        return basicSerialize(value);
    }

    if (typeof value === "string") {
        return `'${value}'`
    }

    if (typeof value === "number") {
        return `'${enumMemberName(enumType.type, value)}'`
    }

    return basicSerialize(value);

    /* TODO:
    ${tab(mapSimpleType("DateTime", "Date"))}
    ${tab(mapSimpleType("DateTimeOffset", "Date"))}
    
    <xs:enumeration value="Edm.Byte"/>
    <xs:enumeration value="Edm.Binary"/>
    <xs:enumeration value="Edm.Duration"/>
    <xs:enumeration value="Edm.TimeOfDay"/>
    <xs:enumeration value="Edm.GeographyPoint"/>
    <xs:enumeration value="Edm.GeographyLineString"/>
    <xs:enumeration value="Edm.GeographyPolygon"/>
    <xs:enumeration value="Edm.GeographyMultiPoint"/>
    <xs:enumeration value="Edm.GeographyMultiLineString"/>
    <xs:enumeration value="Edm.GeographyMultiPolygon"/>
    <xs:enumeration value="Edm.GeographyCollection"/>
    <xs:enumeration value="Edm.GeometryPoint"/>
    <xs:enumeration value="Edm.GeometryLineString"/>
    <xs:enumeration value="Edm.GeometryPolygon"/>
    <xs:enumeration value="Edm.GeometryMultiPoint"/>
    <xs:enumeration value="Edm.GeometryMultiLineString"/>
    <xs:enumeration value="Edm.GeometryMultiPolygon"/>
    <xs:enumeration value="Edm.GeometryCollection"/>
    <xs:enumeration value="Edm.SByte"/>*/

}