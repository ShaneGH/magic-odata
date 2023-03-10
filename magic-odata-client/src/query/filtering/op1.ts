import { ODataTypeRef } from "../../../index.js";
import { Filter, QbEmit } from "../../queryBuilder.js";
import { ReaderWriter } from "../../utils.js";
import { rawType } from "../../valueSerializer.js";
import { Operable, operableToFilter } from "./operable0.js";
import { OutputTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

export type FilterableProps = {
    [key: string]: Operable<any>
}

export type FilterablePaths = {
    [key: string]: string
}

export function filterRaw(filter: string, outputType?: OutputTypes | undefined): Filter;
export function filterRaw(obj: FilterableProps, filter: (path: FilterablePaths) => string, outputType?: OutputTypes | undefined): Filter;
export function filterRaw(arg1: string | FilterableProps, arg2?: ((path: FilterablePaths) => string) | OutputTypes, arg3?: OutputTypes | undefined): Filter {
    if (typeof arg1 === "string") {
        if (typeof arg2 === "function") {
            throw new Error("Invalid method overload");
        }

        return ReaderWriter.retn({
            $$filter: arg1,
            $$output: (arg2 && resolveOutputType(arg2)) || rawType
        }, QbEmit.zero)
    }

    if (typeof arg2 !== "function") {
        throw new Error("Invalid method overload");
    }

    return ReaderWriter.traverse(Object
        .keys(arg1)
        .map(name => operableToFilter(arg1[name])
            .map(filterResult => ({ name, filterResult }))), QbEmit.zero)
        .map(results => results.reduce((s, x) => ({ ...s, [x.name]: x.filterResult.$$filter }), {} as FilterablePaths))
        .map(arg2)
        .map(paths => ({
            $$filter: paths,
            $$output: (arg3 && resolveOutputType(arg3)) || rawType
        }))
}

function toTypeRef(outputType: ODataTypeRef | OutputTypes): ODataTypeRef {
    return typeof outputType === "string"
        ? resolveOutputType(outputType)
        : outputType;
}

export function infixOp(lhs: Filter, op: string, rhs: Filter, outputType: ODataTypeRef | OutputTypes): Filter {

    return lhs
        .bind(l => rhs
            .map(r => ({
                $$output: toTypeRef(outputType),
                $$filter: `${l.$$filter}${op}${r.$$filter}`
            })))
}

export function functionCall(functionName: string, args: Filter[], outputType: ODataTypeRef | OutputTypes): Filter {
    return ReaderWriter
        .traverse(args, QbEmit.zero)
        .map(r => ({
            $$output: toTypeRef(outputType),
            $$filter: `${functionName}(${r.map(x => x.$$filter).join(",")})`
        }))
}