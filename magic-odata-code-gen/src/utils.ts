import { sanitizeNamespace } from "./codeGen/utils.js";
import { CodeGenConfig, SupressWarnings } from "./config.js";
import { ODataTypeRef } from "magic-odata-shared";

export function typeNameString(type: { name: string, namespace: string }, settings: CodeGenConfig | null | undefined, delimiter = "/") {
    return `${type.namespace && `${sanitizeNamespace(type.namespace, settings)}${delimiter}`}${type.name}`
}

export function typeRefNameString(type: ODataTypeRef, settings: CodeGenConfig | null | undefined): string {
    return type.isCollection
        ? `${typeRefNameString(type.collectionType, settings)}[]`
        : typeNameString(type, settings, ".")
}

/**
 * 
 * @returns True if the warning was supressed
 */
export function warn(warnings: SupressWarnings | null | undefined, suppression: keyof SupressWarnings, message: string) {
    if (warnings && (warnings.suppressAll || warnings[suppression])) {
        return true;
    }

    console.warn(`${message}\nTo supress this warning, set warningSettings.${suppression} to false`)
    return false;
}