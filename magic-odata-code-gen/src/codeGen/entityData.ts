import { ODataComplexType, ODataEnum, ComplexTypeOrEnum } from "magic-odata-shared";
import { CodeGenConfig } from "../config.js";
import { typeNameString } from "../utils.js";
import { buildGetTypeString, buildSanitizeNamespace, Tab } from "./utils.js";

export type EntityData = (type: ComplexTypeOrEnum) => string
export const buildEntityData = (settings: CodeGenConfig | null | undefined, tab: Tab): EntityData => {

    const getTypeString = buildGetTypeString(settings);
    const sanitizeNamespace = buildSanitizeNamespace(settings);

    return (type: ComplexTypeOrEnum) => type.containerType === "ComplexType"
        ? buildComplexType(type.type)
        : buildEnum(type.type);

    function buildComplexType(type: ODataComplexType) {

        const q = (nullable: boolean) => nullable || settings?.makeAllPropsOptional === false ? "?" : "";
        const props = Object
            .keys(type.properties)
            .map(key => ({ key, type: getTypeString(type.properties[key].type), nullable: type.properties[key].nullable }))
            .map(prop => `${prop.key}${q(prop.nullable)}: ${prop.type}`)
            .join("\n");

        const baseTypeNs = type.baseType?.namespace ? `${sanitizeNamespace(type.baseType?.namespace)}.` : ""
        const baseType = type.baseType ? `${baseTypeNs}${type.baseType.name} & ` : "";

        return `export type ${type.name} = ${baseType}{
${tab(props)}
}`
    }

    function getEnumValue(settings: CodeGenConfig | null | undefined, key: string, value: number, type: ODataEnum) {
        if (!settings?.enumType) {
            return k();
        }

        if (typeof settings.enumType === "string") {
            if (number(settings.enumType)) {
                return v();
            }

            if (string(settings.enumType)) {
                return k();
            }

            /* istanbul ignore next */
            throw new Error(`Invalid "enumType" setting: ${settings.enumType}`);
        }

        const defaultF = string(settings.enumType.default)
            ? k
            : number(settings.enumType.default)
                ? v
                : null;

        /* istanbul ignore next */
        if (!defaultF) {
            throw new Error(`Invalid "enumType.default" setting: ${settings.enumType.default}`);
        }

        const name = typeNameString(type, settings)
        return settings.enumType.numberEnums && settings.enumType.numberEnums?.indexOf(name) !== -1
            ? v()
            : settings.enumType.stringEnums && settings.enumType.stringEnums?.indexOf(name) !== -1
                ? k()
                : defaultF();

        function string(test: string) { return /^\s*string\s*$/i.test(test) }
        function number(test: string) { return /^\s*number\s*$/i.test(test) }
        function k() { return `"${key}"` }
        function v() { return value.toString() }
    }

    function buildEnum(type: ODataEnum) {

        const members = Object
            .keys(type.members)
            .map(key => `${key} = ${getEnumValue(settings, key, type.members[key], type)}`)
            .join(",\n");

        return `export enum ${type.name} {
${tab(members)}
}`
    }
}