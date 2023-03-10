import { ODataTypeRef } from "../index.js"

export function typeNameString(type: { name: string, namespace: string }, delimiter = "/") {
    return `${type.namespace && `${type.namespace}${delimiter}`}${type.name}`
}

/** Unwrap a type ref and pass to typeNameString */
export function typeRefString(type: ODataTypeRef, delimiter = "/"): string {
    return type.isCollection
        ? typeRefString(type.collectionType, delimiter)
        : typeNameString(type, delimiter)
}

export class Reader<TEnv, T> {
    private constructor(private _func: (env: TEnv) => T) { }

    map<T1>(f: (env: T) => T1) {
        return new Reader<TEnv, T1>(env => f(this.apply(env)))
    }

    mapEnv<TEnv1>(f: (env: TEnv1) => TEnv) {
        return new Reader<TEnv1, T>(env => this.apply(f(env)))
    }

    bind<T1>(f: (env: T) => Reader<TEnv, T1>) {
        return new Reader<TEnv, T1>(env => f(this.apply(env)).apply(env))
    }

    apply(env: TEnv) {
        return this._func(env);
    }

    static create<TEnv, T>(f: (env: TEnv) => T) {
        return new Reader<TEnv, T>(f);
    }

    static retn<T>(x: T): Reader<any, T>;
    static retn<TEnv, T>(x: T): Reader<TEnv, T>;
    static retn<T>(x: T): Reader<any, T> {
        return new Reader<any, T>(_ => x)
    }

    static traverse<TEnv, T>(...readers: Reader<TEnv, T>[]) {
        return new Reader<TEnv, T[]>(env => readers.map(r => r.apply(env)))
    }
}

export class Writer<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }> {

    constructor(private _result: T, private _writer: TSemigroup) { }

    map<T1>(f: (x: T) => T1) {
        return new Writer<T1, TSemigroup>(
            f(this._result), this._writer)
    }

    mapAcc<TSemigroup1 extends { concat: (x: TSemigroup1) => TSemigroup1 }>(f: (x: TSemigroup) => TSemigroup1) {
        const [x, acc] = this.execute()
        return Writer.create<T, TSemigroup1>(x, f(acc))
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

    static traverse<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(items: Writer<T, TSemigroup>[], zero: TSemigroup) {
        return items.reduce(
            (s, x) => s.bind(xs => x.map(x => [...xs, x])),
            Writer.create<T[], TSemigroup>([], zero))
    }
}

export class ReaderWriter<TEnv, T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }> {
    private constructor(private readonly _f: (env: TEnv) => [T, TSemigroup]) { }

    public static create<TEnv, T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(f: (env: TEnv) => [T, TSemigroup]) {
        return new ReaderWriter<TEnv, T, TSemigroup>(f)
    }

    public static retn<TEnv, T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(data: T, zero: TSemigroup): ReaderWriter<TEnv, T, TSemigroup>;
    public static retn<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(data: T, zero: TSemigroup): ReaderWriter<any, T, TSemigroup>;
    public static retn<T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(data: T, zero: TSemigroup): ReaderWriter<any, T, TSemigroup> {
        return new ReaderWriter<any, T, TSemigroup>(_ => [data, zero])
    }

    execute(env: TEnv) {
        return this._f(env)
    }

    map<T1>(f: (x: T) => T1) {
        return new ReaderWriter<TEnv, T1, TSemigroup>(env => {
            const [x, wr] = this.execute(env)
            return [f(x), wr]
        })
    }

    mapEnv<TEnv1>(f: (env: TEnv1) => TEnv) {
        return new ReaderWriter<TEnv1, T, TSemigroup>(env => this.execute(f(env)))
    }

    bind<T1>(f: (x: T) => ReaderWriter<TEnv, T1, TSemigroup>) {
        return new ReaderWriter<TEnv, T1, TSemigroup>(env => {
            const [x, wr1] = this.execute(env)
            const [y, wr2] = f(x).execute(env)
            return [y, wr1.concat(wr2)]
        })
    }

    asReader() {
        return Reader.create<TEnv, [T, TSemigroup]>(env => this.execute(env))
    }

    asWriter(env: TEnv) {
        const [wr, result] = this.execute(env)
        return Writer.create(wr, result)
    }

    observe() {
        return ReaderWriter.create<TEnv, T, TSemigroup>(env => {
            const result = this.execute(env)
            console.log(result)
            return result
        })
    }

    static traverse<TEnv, T, TSemigroup extends { concat: (x: TSemigroup) => TSemigroup }>(items: ReaderWriter<TEnv, T, TSemigroup>[], zero: TSemigroup) {
        return items.reduce(
            (s, x) => s.bind(xs => x.map(x => [...xs, x])),
            ReaderWriter.create<TEnv, T[], TSemigroup>(_ => [[], zero]))
    }
}

export function removeNulls<T>(items: (T | null | undefined)[]): T[] {
    return items.filter(x => x != null) as any
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