import { sanitizeNamespace } from "./codeGen/utils.js";
import { CodeGenConfig, SupressWarnings } from "./config.js";

export function typeNameString(type: { name: string, namespace: string }, settings: CodeGenConfig | null | undefined, delimiter = "/") {
    return `${type.namespace && `${sanitizeNamespace(type.namespace, settings)}${delimiter}`}${type.name}`
}

/**
 * 
 * @returns True if the warning was supressed
 */
export function warn(warnings: SupressWarnings | null | undefined, suppression: keyof SupressWarnings, message: string) {
    if (warnings && (warnings.suppressAll || warnings[suppression])) {
        return true;
    }

    if (!message.endsWith(".")) message += "."
    console.warn(`${message} To supress this warning, set warningSettings.${suppression} to false`)
    return false;
}