import { Keywords } from "./keywords.js";
import { Tab } from "./utils.js";

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