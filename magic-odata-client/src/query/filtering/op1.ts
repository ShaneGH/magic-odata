import { ODataTypeRef } from "magic-odata-shared";
import { Filter } from "../../queryBuilder.js";
import { HasODataQueryMetadata } from "../../typeRefBuilder.js";
import { combineFilterStrings, getOperableFilterString, getOperableTypeInfo, HasFilterMetadata } from "./operable0.js";
import { OutputTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

// using a class here because they play ywell with type deconstruction
export class MappableType<T> {
    constructor(public val: T, public mapper: (x: T) => string) { }

    resolve() {
        return this.mapper(this.val);
    }
}

export type FilterableProps = {
    [key: string]: HasODataQueryMetadata
}

export type FilterablePaths = {
    [key: string]: string
}

export function filterRaw(filter: string, outputType?: OutputTypes | undefined): Filter;
export function filterRaw(obj: FilterableProps, filter: (path: FilterablePaths) => string, outputType?: OutputTypes | undefined): Filter;
export function filterRaw(arg1: string | FilterableProps, arg2?: ((path: FilterablePaths) => string) | OutputTypes, arg3?: OutputTypes | undefined): Filter {

    if (typeof arg1 === "string") {
        if (typeof arg2 === "function" || arg3) {
            throw new Error("Invalid overload args");
        }

        return {
            $$oDataQueryObjectType: "Filter",
            $$output: arg2 && resolveOutputType(arg2),
            $$root: undefined,
            $$filter: arg1
        }
    }

    if (typeof arg2 !== "function") {
        throw new Error("Invalid overload args");
    }

    const paths = Object
        .keys(arg1)
        .reduce((s, x) => ({
            ...s,
            [x]: arg1[x].$$oDataQueryMetadata.path.map(x => x.path).join("/") || "$it"
        }), {} as FilterablePaths);

    return {
        $$oDataQueryObjectType: "Filter",
        $$output: arg3 && resolveOutputType(arg3),
        $$root: undefined,
        $$filter: arg2(paths)
    }
}

/** 
 * an operation with 2 inputs
 */
export function infixOp<T>(
    lhs: HasFilterMetadata,
    operator: string,
    rhs: MappableType<T> | HasFilterMetadata,
    output: ODataTypeRef): Filter {

    try {
        const root = getOperableTypeInfo(lhs).root;
        const lhsS = getOperableFilterString(lhs);
        const rhsS = rhs instanceof MappableType<T>
            ? rhs.resolve()
            : getOperableFilterString(rhs);

        return combineFilterStrings(" ", output, root, lhsS, operator, rhsS)
    } catch (e) {
        throw new Error(`Error executing operation:\n  lhs: ${lhs}\n  operator: ${operator}\n  rhs: ${rhs}\n${e}`);
    }
}