import { ODataTypeRef } from "magic-odata-shared";

export enum IntegerTypes {
    Int16 = "Int16",
    Int32 = "Int32",
    Int64 = "Int64"
}

export enum DecimalNumberTypes {
    Single = "Single",
    Double = "Double",
    Decimal = "Decimal"
}

export type RealNumberTypes = IntegerTypes | DecimalNumberTypes

export enum NonNumericTypes {
    Boolean = "Boolean",
    Guid = "Guid",
    String = "String",
    Date = "Date",
    DateTimeOffset = "DateTimeOffset",
    Duration = "Duration",
    TimeOfDay = "TimeOfDay",
    Binary = "Binary",
    Byte = "Byte",
    GeographyPoint = "GeographyPoint",
    GeographyLineString = "GeographyLineString",
    GeographyPolygon = "GeographyPolygon",
    GeographyMultiPoint = "GeographyMultiPoint",
    GeographyMultiLineString = "GeographyMultiLineString",
    GeographyMultiPolygon = "GeographyMultiPolygon",
    GeographyCollection = "GeographyCollection",
    GeometryPoint = "GeometryPoint",
    GeometryLineString = "GeometryLineString",
    GeometryPolygon = "GeometryPolygon",
    GeometryMultiPoint = "GeometryMultiPoint",
    GeometryMultiLineString = "GeometryMultiLineString",
    GeometryMultiPolygon = "GeometryMultiPolygon",
    GeometryCollection = "GeometryCollection",
    SByte = "SByte"
}

export type OutputTypes = IntegerTypes | DecimalNumberTypes | NonNumericTypes

export function resolveOutputType(t: OutputTypes): ODataTypeRef {
    return {
        isCollection: false,
        name: t,
        namespace: "Edm"
    }
}