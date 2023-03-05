import { ODataTypeRef } from "magic-odata-shared";
import { Filter, FilterEnv, FilterResult, QbEmit } from "../../queryBuilder.js";
import { QueryCollection, QueryEnum, QueryObject, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { ReaderWriter } from "../../utils.js";
import { ParameterDefinition } from "../../entitySet/params.js";

export type Operable<T> = QueryPrimitive<T> | QueryEnum<T> | Filter

export function operableToFilter<T>(op: Operable<T> | QueryCollection<QueryObject<T>, T>) {
    if (op instanceof ReaderWriter) return op;

    return ReaderWriter.create<FilterEnv, FilterResult, QbEmit>(({ rootContext }) => {
        let pathParts = rootContext !== op.$$oDataQueryMetadata.rootContext
            ? [op.$$oDataQueryMetadata.rootContext, ...op.$$oDataQueryMetadata.path.map(x => x.path)]
            : op.$$oDataQueryMetadata.path.map(x => x.path)

        if (!pathParts.length) {
            pathParts = [op.$$oDataQueryMetadata.rootContext]
        }

        return [
            QbEmit.zero,
            {
                $$filter: !op.$$oDataQueryMetadata.path.length
                    ? op.$$oDataQueryMetadata.rootContext
                    : pathParts.join("/"),
                $$output: op.$$oDataQueryMetadata.typeRef
            }]
    });
}

export function valueToFilter<T>(val: Filter | T, typeRef: ODataTypeRef, mapper: ((x: T) => string)) {
    if (val instanceof ReaderWriter) return val;

    return ReaderWriter.create<FilterEnv, FilterResult, QbEmit>(env => [
        QbEmit.zero, {
            $$filter: mapper
                ? mapper(val)
                : serialize(val, typeRef, env.serviceConfig.schemaNamespaces),
            $$output: typeRef
        }])
}

export function asOperable<T>(x: Operable<T> | T): Filter | null {
    if (x instanceof ReaderWriter) return x

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

    return ReaderWriter
        .traverse(filters, QbEmit.zero)
        .map(r => ({
            $$output: output,
            $$filter: r.map(f => f.$$filter).join(operator)
        }))
}