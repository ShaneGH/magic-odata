import { Tab } from "./utils.js";


/* TODO:
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
<xs:enumeration value="Edm.SByte"/> */

export function edm(tab: Tab) {
    return `/**
 * Type references for described Edm data types.
 */
export module Edm {
${tab(mapSimpleType("String", "string"))}
${tab(mapSimpleType("Guid", "string"))}
${tab(mapSimpleType("Boolean", "boolean"))}
${tab(mapSimpleType("DateTime", "Date"))}
${tab(mapSimpleType("DateTimeOffset", "Date"))}
${tab(mapSimpleType("Int16", "number"))}
${tab(mapSimpleType("Int32", "number"))}
${tab(mapSimpleType("Int64", "number"))}
${tab(mapSimpleType("Decimal", "number"))}
${tab(mapSimpleType("Double", "number"))}
${tab(mapSimpleType("Single", "number"))}
}`

    function mapSimpleType(edmName: string, primitiveName: string) {
        return `export type ${edmName} = ${primitiveName};`;
    }
}