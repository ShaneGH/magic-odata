import { ODataTypeRef } from "magic-odata-shared";
import { Filter, FilterEnv, FilterResult, QbEmit } from "../../queryBuilder.js";
import { QueryCollection, QueryEnum, QueryObject, QueryPrimitive } from "../queryComplexObjectBuilder.js";
import { rawType, serialize } from "../../valueSerializer.js";
import { ReaderWriter, Writer } from "../../utils.js";
import { SubPathSelection } from "../../entitySet/subPath.js";
import { IEntitySet } from "../../entitySetInterfaces.js";

export type Operable<T> = QueryPrimitive<T> | QueryEnum<T> | Filter | SubPathSelection<IEntitySet<any, T, any, any, any, any, any, any>>

function isSubPathSelection<T>(x: any): x is SubPathSelection<IEntitySet<any, T, any, any, any, any, any, any>> {
    const keys = Object.keys(x)
    return !!keys.length
        && keys.indexOf("propertyName") !== -1
        && keys.indexOf("outputType") !== -1
        && typeof x["propertyName"] === "string"
        && typeof x["outputType"] === "object"
}

function processSubPath(subPath: SubPathSelection<any>): Filter {
    return ReaderWriter.retn<FilterEnv, FilterResult, QbEmit>({
        $$filter: subPath.propertyName,
        $$output: subPath.outputType || rawType
    }, subPath.qbEmit)
}

export function operableToFilter<T>(op: Operable<T> | QueryCollection<QueryObject<T>, T>): Filter {
    if (op instanceof ReaderWriter) return op;

    if (isSubPathSelection(op)) {
        return processSubPath(op)
    }

    return ReaderWriter.create<FilterEnv, FilterResult, QbEmit>(({ rootContext }) => {
        let pathParts = rootContext !== op.$$oDataQueryMetadata.rootContext
            ? [op.$$oDataQueryMetadata.rootContext, ...op.$$oDataQueryMetadata.path.map(x => x.path)]
            : op.$$oDataQueryMetadata.path.map(x => x.path)

        if (!pathParts.length) {
            pathParts = [op.$$oDataQueryMetadata.rootContext]
        }

        return [
            {
                $$filter: !op.$$oDataQueryMetadata.path.length
                    ? op.$$oDataQueryMetadata.rootContext
                    : pathParts.join("/"),
                $$output: op.$$oDataQueryMetadata.typeRef
            },
            op.$$oDataQueryMetadata.qbEmit
        ]
    });
}

export function filterize<T>(
    toFilterize: Operable<T> | T,
    expected: ODataTypeRef,
    mapper: ((x: T) => string) | undefined) {

    const toFilterizeO = asOperable(toFilterize)
    if (toFilterizeO) {
        return operableToFilter(toFilterizeO)
    }

    return valueToFilter(toFilterize as Filter | T, expected, mapper)
}

export function valueToFilter<T>(val: Filter | T, typeRef: ODataTypeRef, mapper: ((x: T) => string) | undefined) {
    if (val instanceof ReaderWriter) return val;

    return ReaderWriter.create<FilterEnv, FilterResult, QbEmit>(env =>
        (mapper
            ? Writer.create(mapper(val), QbEmit.zero)
            : serialize(val, typeRef, env.serviceConfig.schemaNamespaces)
                .mapAcc(QbEmit.maybeZero))
            .map($$filter => ({
                $$filter,
                $$output: typeRef
            })).execute())
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