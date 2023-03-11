import { ComplexTypeOrEnum, Dict, ODataEnum, ODataSchema, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared";
import { ODataDate, ODataDuration, ODataTimeOfDay, ODataDateTimeOffset } from "./edmTypes.js";
import { IUriBuilder } from "./entitySetInterfaces.js";
import { typeRefString, Writer } from "./utils.js";

export type ParameterDefinition =
    | { type: "Ref", data: { name: string, uri: IUriBuilder } }
    | { type: "Const", data: { name: string, value: any, paramType: ODataTypeRef | undefined } }
    | { type: "Param", data: { name: string } }

export class AtParam {
    public readonly name: string

    constructor(public readonly param: ParameterDefinition) {
        this.name = param.data.name
        if (!this.name.length || this.name[0] !== "@") {
            throw new Error(`Parameters must begin with @: "${name}"`);
        }
    }
}

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
    if (value == null)
        return "null"

    if (typeof value === "string")
        return stringSerialize(value);

    if (value === Infinity)
        return "INF"

    return value.toString();
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

function toDateInputs(date: Date) {
    return {
        y: date.getFullYear(),
        M: date.getMonth() + 1,
        d: date.getDate()
    }
}

function serializeDate(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Date) {

        return serializeDate(new ODataDate(toDateInputs(value)))
    }

    if (!(value instanceof ODataDate) && !(value instanceof ODataDateTimeOffset)) {
        console.warn("Unknown Edm.Date type in serialization");
        return value?.toString() || ""
    }

    return `${pad4(value.y)}-${pad2(value.M)}-${pad2(value.d)}`
}

function factor(value: number, factor: number) {

    if (value < factor) {
        return { result: 0, remainder: value }
    }

    const result = Math.floor(value / factor)
    const remainder = value % factor
    return { result, remainder }
}

function serializeDuration(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {

        return serializeDuration(ODataDuration.fromMilliseconds(value))
    }

    if (!(value instanceof ODataDuration)) {
        console.warn("Unknown Edm.Duration type in serialization");
        return value?.toString() || ""
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

function toTimeInputs(date: Date) {
    return {
        h: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds(),
        ms: date.getMilliseconds()
    }
}

function serializeTime(value: any): string {
    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Date) {
        return serializeTime(new ODataTimeOfDay(toTimeInputs(value)));
    }

    if (!(value instanceof ODataTimeOfDay) && !(value instanceof ODataDateTimeOffset)) {
        console.warn("Unknown Edm.Time type in serialization");
        return value?.toString() || ""
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

    if (value instanceof Date) {

        const offsetMin = value.getTimezoneOffset()
        const sign = offsetMin < 0 ? -1 : 1;
        const { result, remainder } = factor(Math.abs(offsetMin), 60)

        return serializeDateTimeOffset(
            new ODataDateTimeOffset({
                ...toDateInputs(value),
                ...toTimeInputs(value),
                offsetH: result * sign,
                offsetM: remainder * sign
            }))
    }

    const date = serializeDate(value)
    const time = serializeTime(value)
    let offset = value

    if (!(value instanceof ODataDateTimeOffset)) {
        console.warn("Unknown Edm.DateTimeOffset type in serialization");
        return value?.toString() || ""
    }

    const sign = offset.offsetH < 0 || offset.offsetM < 0 ? "-" : "+";
    return `${date}T${time}${sign}${pad2(Math.abs(offset.offsetH || 0))}:${pad2(Math.abs(offset.offsetM || 0))}`
}

const warnedCollectionTypes = {} as { [k: string]: boolean }
const warnedEnumTypes = {} as { [k: string]: boolean }
export const rawType: ODataSingleTypeRef = { isCollection: false, namespace: "magic-odata", name: "Raw" }

export function serialize(value: any, type?: ODataTypeRef, serviceConfig?: Dict<ODataSchema>): Writer<string, [AtParam, ODataTypeRef][]> {
    const asString = serialize_legacy(value, type, serviceConfig)
    if (!type || !(value instanceof AtParam)) {
        return Writer.create(asString, [])
    }

    return Writer.create(asString, [[value, type]])
}

// eventually will be made private
export function serialize_legacy(value: any, type?: ODataTypeRef, serviceConfig?: Dict<ODataSchema>): string {

    if (value == null) {
        return "null"
    }

    if (value instanceof AtParam) {
        return value.name
    }

    if (Array.isArray(value)) {
        type = type?.isCollection ? type.collectionType : type
        return `[${value.map(x => serialize_legacy(x, type, serviceConfig))}]`
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

    if (type.namespace === rawType.namespace && type.name === rawType.name) {
        if (typeof value.toString === "function") {
            return value.toString();
        }
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

    const enumType: ComplexTypeOrEnum | undefined = serviceConfig[type.namespace] && serviceConfig[type.namespace].types[type.name]
    if (!enumType || enumType.containerType !== "Enum") {

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
}