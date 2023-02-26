import { Filter, FilterEnv, FilterResult } from "../../queryBuilder.js";
import { Reader } from "../../utils.js";
import { serialize } from "../../valueSerializer.js";
import { OperableCollection } from "./collection1.js";
import { infixOp } from "./op1.js";
import { asOperable, combineFilterStrings, Operable, operableToFilter } from "./operable0.js";
import { NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const bool = resolveOutputType(NonNumericTypes.Boolean)

function filterize<T>(
    toFilterize: Operable<T> | T,
    supplimentary: Operable<T>,
    mapper: ((x: T) => string) | undefined) {

    const toFilterizeO = asOperable(toFilterize)
    if (toFilterizeO) {
        return operableToFilter(toFilterizeO)
    }

    return operableToFilter(supplimentary)
        .map(({ $$output }) => $$output)
        .bind($$output => Reader.create<FilterEnv, FilterResult>(({ serviceConfig }) => ({
            $$output,
            $$filter: mapper
                ? mapper(toFilterize as T)
                : serialize(toFilterize, $$output, serviceConfig.types)
        })))
}

/** 
 * an operation with 2 inputs of the same type
 * which return a boolean
 */
export function logicalInfixOp<T>(
    lhs: Operable<T>,
    operator: string,
    rhs: T | Operable<T>,
    mapper: ((x: T) => string) | undefined): Filter {

    return infixOp(operableToFilter(lhs), ` ${operator} `, filterize(rhs, lhs, mapper), bool)
}

export function eq<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "eq", rhs, mapper);
}

export function ne<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "ne", rhs, mapper);
}

export function lt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "lt", rhs, mapper);
}

export function le<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "le", rhs, mapper);
}

export function gt<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "gt", rhs, mapper);
}

export function ge<T>(lhs: Operable<T>, rhs: T | Operable<T>, mapper?: (x: T) => string): Filter {
    return logicalInfixOp(lhs, "ge", rhs, mapper);
}

export function not(condition: Filter, group = true): Filter {

    return condition
        .map(x => ({
            ...x,
            $$filter: `not${group ? `(${x.$$filter})` : ` ${x.$$filter}`}`
        }))
}

export function group(condition: Filter): Filter {

    return condition
        .map(x => ({
            ...x,
            $$filter: `(${x.$$filter})`
        }))
}

export function and(...conditions: Filter[]): Filter {
    if (conditions.length === 0) {
        throw new Error("You must include at least 1 condition");
    }

    return combineFilterStrings(" and ", bool, ...conditions)
}

export function or(...conditions: Filter[]): Filter {
    if (conditions.length === 0) {
        throw new Error("You must include at least 1 condition");
    }

    return combineFilterStrings(" or ", bool, ...conditions)
}

export function isIn<T>(lhs: Operable<T>, rhs: T[] | OperableCollection<T>, mapper?: (x: T) => string): Filter {

    lhs = operableToFilter(lhs)
    if (Array.isArray(rhs)) {
        const rhsA = rhs;
        rhs = lhs.bind(({ $$output }) => Reader.create<FilterEnv, FilterResult>(env => ({
            $$output: { isCollection: true, collectionType: $$output },
            $$filter: `[${mapper
                ? rhsA.map(mapper).join(",")
                : rhsA.map(x => serialize(x, $$output, env.serviceConfig.types)).join(",")}]`
        })))
    }

    lhs = operableToFilter(lhs)
    rhs = operableToFilter(rhs)

    return combineFilterStrings(" in ", bool, lhs, rhs)
}