import { ODataEnum, ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";
import { DateStruct, DurationStruct, OffsetStruct, TimeStruct } from "./edmTypes.js";
import { typeRefString } from "./utils.js";

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

function pad2(x: number) {
    if (isNaN(x)) return x?.toString() || ""
    return x < 10 ? `0${x}` : x.toString();
}

function pad3(x: number) {
    if (isNaN(x)) return x?.toString() || ""
    const p2 = pad2(x)
    return p2.length < 3 ? `0${p2}` : p2
}

function pad4(x: number) {
    if (isNaN(x)) return x?.toString() || ""
    const p3 = pad3(x)
    return p3.length < 4 ? `0${p3}` : p3
}

function serializeDate(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Date) {
        const d: DateStruct = {
            y: value.getFullYear(),
            M: value.getMonth() + 1,
            d: value.getDate()
        };

        return serializeDate(d)
    }

    return `${pad4(value.y)}-${pad2(value.M)}-${pad2(value.d)}`
}

function factor(value: number, factor: number) {

    if (value < factor) {
        return { result: 0, remainder: value }
    }

    const result = parseInt((value / factor).toFixed())
    const remainder = value % factor
    return { result, remainder }
}

function serializeDuration(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {

        const sign = value < 0 ? -1 : 1;
        value = Math.abs(value)

        const days = factor(value, 8.64e+7)
        const hours = factor(days.remainder, 3.6e+6)
        const minutes = factor(hours.remainder, 60000)
        const seconds = factor(minutes.remainder, 1000)

        const duration: DurationStruct = {
            d: days.result * sign,
            h: hours.result * sign,
            m: minutes.result * sign,
            s: seconds.result * sign,
            ms: seconds.remainder * sign
        }

        return serializeDuration(duration)
    }

    if (!checkSigns(value)) {

        throw new Error(`Duration values must be the same sign - ${JSON.stringify(value)}`);
    }

    const sign = value.d < 0 || value.h < 0 || value.m < 0 || value.s < 0 || value.ms < 0
        ? "-" : ""
    const day = Math.abs(value.d || 0);
    const hour = Math.abs(value.h || 0);
    const minute = Math.abs(value.m || 0);
    const second = Math.abs(value.s || 0);
    const ms = pad3(Math.abs(value.ms || 0));

    return `duration'${sign}P${day}DT${hour}H${minute}M${second}.${ms}S'`
}

/** Check that all numeric properties have the same sign */
function checkSigns(data: { [k: string]: any }) {
    const results = Object
        .keys(data)
        .map(k => data[k]!)
        .filter(x => x && !isNaN(x));    // filter out 0 and null

    const nonNegative = results.filter(x => x > 0).length
    return nonNegative === 0 || nonNegative === results.length
}

function serializeTime(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Date) {
        const d: TimeStruct = {
            h: value.getHours(),
            m: value.getMinutes(),
            s: value.getSeconds(),
            ms: value.getMilliseconds()
        };

        return serializeTime(d)
    }

    const hour = pad2(value.h || 0);
    const minute = pad2(value.m || 0);
    const second = pad2(value.s || 0);
    const ms = pad3(value.ms || 0);

    return `${hour}:${minute}:${second}.${ms}`
}

function serializeDateTimeOffset(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    const date = serializeDate(value)
    const time = serializeTime(value)
    let offset = value

    if (offset instanceof Date) {

        let offsetMin = value.getTimezoneOffset()
        const sign = offsetMin < 0 ? -1 : 1;
        offsetMin = Math.abs(offsetMin)

        const { result, remainder } = factor(offsetMin, 60)
        offset = { offsetH: result * sign, offsetM: remainder * sign }
    }

    if (!checkSigns(offset)) {

        throw new Error(`Offset hour and minute values must be the same sign - h: ${offset.h}, m: ${offset.m}`);
    }

    const sign = offset.h < 0 || offset.m < 0 ? "-" : "+";
    return `${date}T${time}${sign}${pad2(Math.abs(offset.offsetH || 0))}:${pad2(Math.abs(offset.offsetM || 0))}`
}

const warnedCollectionTypes = {} as { [k: string]: boolean }
const warnedEnumTypes = {} as { [k: string]: boolean }

export function serialize(value: any, type?: ODataTypeRef, serviceConfig?: ODataServiceTypes): string {
    if (value == null) {
        return "null"
    }

    if (Array.isArray(value)) {
        type = type?.isCollection ? type.collectionType : type
        return `[${value.map(x => serialize(x, type, serviceConfig))}]`
    }

    if (type?.isCollection) {
        const name = typeRefString(type)
        if (!warnedCollectionTypes[name]) {
            console.warn(`Collection type found when serializing non collection for filter. `
                + `Ignoring type info. This may lead to incorrect serializaton of values in filtering`, type);
        }

        warnedCollectionTypes[name] = true
        type = undefined;
    }

    if (!type) {
        return basicSerialize(value);
    }

    if (type.namespace === "Edm") {
        // https://github.com/ShaneGH/magic-odata/issues/7
        switch (type.name) {
            case "String":
            case "Boolean":
            case "Int16":
            case "Int32":
            case "Int64":
            case "Decimal":
            case "Double":
            case "Byte":
            case "SByte":
            case "Single": return basicSerialize(value);
            case "Binary": return `binary'${value}'`;
            case "Duration": return serializeDuration(value);
            case "TimeOfDay": return serializeTime(value);
            case "Date": return serializeDate(value);
            case "DateTimeOffset": return serializeDateTimeOffset(value);
            case "Duration":
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

        const name = typeRefString(type)
        if (!warnedEnumTypes[name]) {
            console.warn(`Complex type found when serializing value for filter. `
                + `Ignoring type info. This may lead to incorrect serializaton of values in filtering`, type);
        }

        warnedEnumTypes[name] = true
        return basicSerialize(value);
    }

    if (typeof value === "string") {
        return `'${value}'`
    }

    if (typeof value === "number") {
        return `'${enumMemberName(enumType.type, value)}'`
    }

    return basicSerialize(value);

    /* https://github.com/ShaneGH/magic-odata/issues/8
    ${tab(mapSimpleType("Date", "Date"))}
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