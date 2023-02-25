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