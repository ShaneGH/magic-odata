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

export type Dict<T> = { [key: string]: T }

export function groupBy<T>(x: T[], grouping: (x: T) => string): Dict<T[]> {
    return x
        .reduce((s, x) => {
            const key = grouping(x)
            return s[key]
                ? {
                    ...s,
                    [key]: s[key].concat([x])
                } : {
                    ...s,
                    [key]: [x]
                }
        }, {} as Dict<T[]>)
}

export type Node<T> = {
    value: T | undefined
    children: Dict<Node<T>>
}

export function treeify<T>(values: [key: string[], value: T][]): Node<T[]> {

    const grouped = groupBy(values, ([k]) => k[0] || "")

    const value = (grouped[""] || []).map(([, x]) => x)

    const children = Object
        .keys(grouped)
        .filter(x => !!x)
        .reduce((s, k) => ({
            ...s,
            [k]: treeify(grouped[k].map(([x, y]) => [x.slice(1), y]))
        }), {} as Dict<Node<T[]>>)

    return {
        value,
        children
    }
}