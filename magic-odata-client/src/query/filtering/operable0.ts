import { ODataTypeRef } from "magic-odata-shared";
import { Filter, FilterEnv, FilterResult } from "../../queryBuilder.js";
import { QueryCollection, QueryEnum, QueryObject, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { Reader } from "../../utils.js";

export type Operable<T> = QueryPrimitive<T> | QueryEnum<T> | Filter

export function operableToFilter<T>(op: Operable<T> | QueryCollection<QueryObject<T>, T>) {
    if (op instanceof Reader) return op;

    return Reader.create<FilterEnv, FilterResult>(({ rootContext }) => {
        let pathParts = rootContext !== op.$$oDataQueryMetadata.rootContext
            ? [op.$$oDataQueryMetadata.rootContext, ...op.$$oDataQueryMetadata.path.map(x => x.path)]
            : op.$$oDataQueryMetadata.path.map(x => x.path)

        if (!pathParts.length) {
            pathParts = [op.$$oDataQueryMetadata.rootContext]
        }

        return {
            $$filter: !op.$$oDataQueryMetadata.path.length
                ? op.$$oDataQueryMetadata.rootContext
                : pathParts.join("/"),
            $$output: op.$$oDataQueryMetadata.typeRef
        }
    });
}

export function valueToFilter<T>(val: Filter | T, typeRef: ODataTypeRef, mapper: ((x: T) => string)) {
    if (val instanceof Reader) return val;

    return Reader.create<FilterEnv, FilterResult>(env => ({
        $$filter: mapper
            ? mapper(val)
            : serialize(val, typeRef, env.root),
        $$output: typeRef
    }))
}

export function asOperable<T>(x: Operable<T> | T): Filter | null {
    if (x instanceof Reader) return x

    const asAny = x as any
    if (typeof asAny?.$$oDataQueryObjectType === "string") {
        return operableToFilter(asAny)
    }

    return null
}

export function combineFilterStrings(
    operator: string,
    output: ODataTypeRef,
    ...filters: Filter[]): Filter {

    return Reader
        .traverse(...filters)
        .map(r => ({
            $$output: output,
            $$filter: r.map(f => f.$$filter).join(operator)
        }))
}