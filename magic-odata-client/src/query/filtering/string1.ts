import { ODataTypeRef } from "magic-odata-shared";
import { Filter } from "../../queryBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { combineFilterStrings, getFilterString, getOperableFilterString, getOperableTypeInfo, Operable } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const stringT = resolveOutputType(NonNumericTypes.String)
const boolT = resolveOutputType(NonNumericTypes.Boolean)
const int32T = resolveOutputType(IntegerTypes.Int32)

export function concat(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function concat(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function concat<T>(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    if (typeof lhs === "string") {
        if (typeof rhs === "string") {
            throw new Error("Invalid method overload");
        }

        return _concat(rhs, lhs, true);
    }

    return _concat(lhs, rhs, false);
}

function _concat(lhs: Operable<string>, rhs: Operable<string> | string, swap: boolean): Filter {
    const metadata = getOperableTypeInfo(lhs)
    let lhsS = getOperableFilterString(lhs)
    let rhsS = getFilterString(rhs, undefined, metadata)

    if (swap) {
        const x = lhsS
        lhsS = rhsS
        rhsS = x
    }

    return combineFilterStrings("", stringT, metadata.root, `concat(${lhsS},${rhsS})`);
}

function stringFunction(name: string, lhs: Operable<string> | string, rhs: Operable<string> | string, result: ODataTypeRef): Filter {

    if (typeof lhs === "string" && typeof rhs === "string") {
        throw new Error("Invalid method overload");
    }

    const { nonString, possibleString, rev } = typeof lhs === "string"
        ? {
            nonString: rhs as Operable<string>,
            possibleString: lhs,
            rev: true
        } : {
            nonString: lhs,
            possibleString: rhs,
            rev: false
        }


    const metadata = getOperableTypeInfo(nonString)
    let lhsS = getOperableFilterString(nonString)
    let rhsS = typeof possibleString === "string"
        ? serialize(possibleString)
        : getOperableFilterString(possibleString);

    if (rev) {
        const x = lhsS
        lhsS = rhsS
        rhsS = x
    }

    return combineFilterStrings("", result, metadata.root, `${name}(${lhsS},${rhsS})`);
}

export function contains(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function contains(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function contains(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("contains", lhs, rhs, boolT);
}

export function startsWith(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function startsWith(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function startsWith(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("startswith", lhs, rhs, boolT);
}

export function endsWith(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function endsWith(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function endsWith(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("endswith", lhs, rhs, boolT);
}

export function indexOf(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function indexOf(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function indexOf(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("indexof", lhs, rhs, int32T);
}

export function length(lhs: Operable<string>): Filter {

    const metadata = getOperableTypeInfo(lhs)
    let lhsS = getOperableFilterString(lhs)

    return combineFilterStrings("", int32T, metadata.root, `length(${lhsS})`);
}

export function subString(lhs: Operable<string>, start: number, length?: number): Filter {

    const metadata = getOperableTypeInfo(lhs);
    const lhsS = getOperableFilterString(lhs)

    const filter = length == null ? `substring(${lhsS},${start})` : `substring(${lhsS},${start},${length})`;
    return combineFilterStrings("", stringT, metadata.root, filter);
}