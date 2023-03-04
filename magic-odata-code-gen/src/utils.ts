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

export function toList<T>(x: Dict<T>): [string, T][] {
    return Object.keys(x).map(k => [k, x[k]])
}

export function mapDict<T, T1>(items: Dict<T>, mapper: (x: T) => T1, keyMapper?: (x: string) => string) {
    return Object
        .keys(items)
        .reduce((s, x) => {
            const newK = keyMapper ? keyMapper(x) : x
            if (s[newK]) throw new Error(`Duplicate key: ${newK}`);

            return {
                ...s,
                [newK]: mapper(items[x])
            }
        }, {} as Dict<T1>)
}

export function filterDict<T>(items: Dict<T>, filter: (k: string, v: T) => boolean) {
    return Object
        .keys(items)
        .filter(k => filter(k, items[k]))
        .reduce((s, x) => ({
            ...s,
            [x]: items[x]
        }), {} as Dict<T>)
}

export function removeDictNulls<T>(items: Dict<T | null | undefined>) {
    return hasNoNulls(filterDict(items, (_, x) => x != null))
}

export function removeNulls<T>(items: (T | null | undefined)[]): T[] {
    return items.filter(x => x != null) as any
}

export function removeNullNulls<T>(items: (T | null | undefined)[] | undefined): T[] | undefined {
    if (!items) return undefined
    return items.filter(x => x != null) as any
}

export function flatten<T>(xs: T[][]) {
    return xs.reduce((s, x) => [...s, ...x], [])
}

export function hasNoNulls<T>(dict: Dict<T | undefined | null>): Dict<T> {
    return dict as any
}

export function zip<T, U>(xs: T[], ys: U[]): [T | undefined, U | undefined][] {

    const output: [T | undefined, U | undefined][] = []
    for (let i = 0; i < xs.length || i < ys.length; i++) {
        output.push([xs[i], ys[i]])
    }

    return output
}

export function distinct(xs: string[]) {
    return Object.keys(keyDictionary(xs))
}

export function keyDictionary(xs: string[]) {
    return xs.reduce((s, x) => s[x] ? s : { ...s, [x]: true as true }, {} as Dict<true>)
}

export class Writer<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }> {

    constructor(private _result: T, private _writer: TSemigroup) { }

    map<T1>(f: (x: T) => T1) {
        return new Writer<T1, TSemigroup>(
            f(this._result), this._writer)
    }

    bind<T1>(f: (x: T) => [T1, TSemigroup] | Writer<T1, TSemigroup>) {

        const result = f(this._result)
        return Array.isArray(result)
            ? new Writer(result[0], this._writer.concat(result[1]))
            : new Writer(result.execute()[0], this._writer.concat(result.execute()[1]))
    }

    execute(): [T, TSemigroup] {
        return [this._result, this._writer]
    }

    apply<T1>(w: Writer<(x: T) => T1, TSemigroup>): Writer<() => T1, TSemigroup>;
    apply<T1, U>(w: Writer<(x0: T, x1: T1) => U, TSemigroup>): Writer<(x1: T1) => U, TSemigroup>;
    apply<T1, T2, U>(w: Writer<(x0: T, x1: T1, x2: T2) => U, TSemigroup>): Writer<(x1: T1, x2: T2) => U, TSemigroup>;
    apply<T1, T2, T3, U>(w: Writer<(x0: T, x1: T1, x2: T2, x3: T3) => U, TSemigroup>): Writer<(x1: T1, x2: T2, x3: T3) => U, TSemigroup>;
    apply(w: Writer<any, TSemigroup>): Writer<any, TSemigroup> {

        const mappedF = w.execute()[0].bind(null, this._result)
        return Writer.create(mappedF, this._writer.concat(w.execute()[1]))
    }

    static create<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(result: T, writer: TSemigroup) {
        return new Writer(result, writer)
    }
}