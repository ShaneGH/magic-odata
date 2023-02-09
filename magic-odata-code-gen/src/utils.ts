import { SupressWarnings } from "./config.js";

export function typeNameString(type: { name: string, namespace: string }, delimiter = "/") {
    return `${type.namespace && `${type.namespace}${delimiter}`}${type.name}`
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