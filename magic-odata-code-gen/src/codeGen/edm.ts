import { Keywords } from "./keywords.js";
import { Tab } from "./utils.js";


/* https://github.com/ShaneGH/magic-odata/issues/8
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

export function edm(tab: Tab, keywords: Keywords) {
    return `type ${keywords.DateAlias} = Date

/**
 * Type references for described Edm data types.
 */
export module Edm {
${tab(`${mapSimpleType("String", "string")}
${mapSimpleType("Guid", "string")}
${mapSimpleType("Boolean", "boolean")}
${mapSimpleType("Date", `${keywords.DateAlias} | string | ${keywords.DateStruct}`)}
${mapSimpleType("TimeOfDay", `${keywords.DateAlias} | string | ${keywords.TimeStruct}`)}
${mapSimpleType("DateTimeOffset", `${keywords.DateAlias} | string | (${keywords.DateStruct} & Partial<${keywords.TimeStruct}> & Partial<${keywords.OffsetStruct}>)`)}
/** If the duration is a number, it is measured in milliseconds */
${mapSimpleType("Duration", `${keywords.DurationStruct} | string | number`)}
${mapSimpleType("Int16", "number")}
${mapSimpleType("Int32", "number")}
${mapSimpleType("Int64", "number")}
${mapSimpleType("Decimal", "number")}
${mapSimpleType("Double", "number")}
/** Binary data is a base 64 string */
${mapSimpleType("Binary", "string")}
${mapSimpleType("Single", "number")}
${mapSimpleType("Byte", "number")}
${mapSimpleType("SByte", "number")}`)}
}`

    function mapSimpleType(edmName: string, primitiveName: string) {
        return `export type ${edmName} = ${primitiveName};`;
    }
}