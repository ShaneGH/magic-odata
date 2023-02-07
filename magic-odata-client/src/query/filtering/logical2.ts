import { Filter } from "../../queryBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { OperableCollection } from "./collection1.js";
import { infixOp, MappableType } from "./op1.js";
import { combineFilterStrings, getFilterString, getOperableFilterString, getOperableTypeInfo, HasFilterMetadata, Operable, TypeLookup } from "./operable0.js";
import { NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const bool = resolveOutputType(NonNumericTypes.Boolean)

/** 
 * an operation with 2 inputs of the same type
 * which return a boolean
 */
export function logicalInfixOp<T>(
    lhs: Operable<T>,
    operator: string,
    rhs: T | Operable<T>,
    mapper: ((x: T) => string) | undefined): Filter {

    const metadata = getOperableTypeInfo(lhs);
    const mappableRhs = typeof (rhs as any)?.$$oDataQueryObjectType === "string"
        ? rhs as HasFilterMetadata
        : new MappableType<T>(
            rhs as T,
            mapper || ((x: T) => serialize(x, metadata.typeRef, metadata.root)));

    return infixOp(lhs, operator, mappableRhs, bool)
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

    return {
        ...condition,
        $$filter: `not${group ? `(${condition.$$filter})` : ` ${condition.$$filter}`}`
    }
}

export function group(condition: Filter): Filter {

    return {
        ...condition,
        $$filter: `(${condition.$$filter})`
    }
}

export function and(...conditions: Filter[]): Filter {
    if (conditions.length === 0) {
        throw new Error("You must include at least 1 condition");
    }

    return combineFilterStrings(" and ", bool, conditions[0]?.$$root, ...conditions.map(x => x.$$filter))
}

export function or(...conditions: Filter[]): Filter {
    if (conditions.length === 0) {
        throw new Error("You must include at least 1 condition");
    }

    return combineFilterStrings(" or ", bool, conditions[0]?.$$root, ...conditions.map(x => x.$$filter))
}

function makeCollectionMapper<T>(mapper: ((x: T) => string) | undefined, metadata: TypeLookup) {

    return (mapper && ((xs: T[]) => xs?.map(mapper!).join(",")))
        || ((xs: T[]) => serialize(xs, metadata.typeRef && { isCollection: true, collectionType: metadata.typeRef }, metadata.root))
}

export function isIn<T>(lhs: Operable<T>, rhs: T[] | OperableCollection<T>, mapper?: (x: T) => string): Filter {

    const metadata = getOperableTypeInfo(lhs)
    const lhsS = getOperableFilterString(lhs);
    const rhsS = Array.isArray(rhs)
        ? getFilterString(rhs, makeCollectionMapper(mapper, metadata), null)
        : getOperableFilterString(rhs);

    return combineFilterStrings(" in ", bool, metadata.root, lhsS, rhsS)
}