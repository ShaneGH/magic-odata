import { Filter, FilterEnv } from "../../queryBuilder.js";
import { Reader } from "../../utils.js";
import { functionCall, infixOp } from "./op1.js";
import { Operable, operableToFilter } from "./operable0.js";
import { DecimalNumberTypes, IntegerTypes, RealNumberTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const int32T = resolveOutputType(IntegerTypes.Int32)
const int64T = resolveOutputType(IntegerTypes.Int64)
const doubleT = resolveOutputType(IntegerTypes.Int32)

const integerTypes = Object.keys(IntegerTypes);
function isInteger(item: Operable<number> | number) {

    if (typeof item === "number") {
        return Reader.retn<boolean>(Number.isInteger(item));
    }

    return operableToFilter(item)
        .map(f => f?.$$output
            && !f.$$output.isCollection
            && f.$$output.namespace === "Edm"
            && integerTypes.indexOf(f.$$output.name) !== -1)
}

function guessAritmeticOutputType(
    lhs: Operable<number> | number, operator: string, rhs: Operable<number> | number): Reader<FilterEnv, RealNumberTypes> {

    if (operator === "div" || operator === "divby") {
        return Reader.retn(DecimalNumberTypes.Double)
    }

    return isInteger(lhs)
        .bind(l => isInteger(rhs)
            .map(r => ({ l, r })))
        .map(({ l, r }) => l && r ? IntegerTypes.Int64 : DecimalNumberTypes.Double)
}

function toFilter(lhs: Operable<number> | number): Filter {
    if (typeof lhs !== "number") {
        return operableToFilter(lhs)
    }

    return Reader.retn({
        $$filter: lhs == null ? "null" : lhs.toString(),
        $$output: Number.isInteger(lhs) ? int64T : doubleT
    })
}

/** 
 * an operation with 2 nummeric inputs which return a number
 */
function arithmeticInfixOp(
    lhs: Operable<number> | number,
    operator: string,
    rhs: Operable<number> | number,
    result: RealNumberTypes | undefined): Filter {

    const r = (result && Reader.retn(result)) || guessAritmeticOutputType(lhs, operator, rhs)

    return r
        .bind(r => infixOp(toFilter(lhs), ` ${operator} `, toFilter(rhs), r))
}

export function add(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {
    return arithmeticInfixOp(lhs, "add", rhs, result);
}

export function sub(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter;
export function sub(lhs: Operable<number> | number, rhs: Operable<number>, result: RealNumberTypes | undefined): Filter;
export function sub(lhs: Operable<number> | number, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {

    return arithmeticInfixOp(lhs, "sub", rhs, result);
}

export function mul(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter;
export function mul(lhs: Operable<number> | number, rhs: Operable<number>, result: RealNumberTypes | undefined): Filter;
export function mul(lhs: Operable<number> | number, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {
    return arithmeticInfixOp(lhs, "mul", rhs, result);
}

export function div(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter;
export function div(lhs: Operable<number> | number, rhs: Operable<number>, result: RealNumberTypes | undefined): Filter;
export function div(lhs: Operable<number> | number, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {
    return arithmeticInfixOp(lhs, "div", rhs, result);
}

export function divby(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter;
export function divby(lhs: Operable<number> | number, rhs: Operable<number>, result: RealNumberTypes | undefined): Filter;
export function divby(lhs: Operable<number> | number, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {
    return arithmeticInfixOp(lhs, "divby", rhs, result);
}

export function mod(lhs: Operable<number>, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter;
export function mod(lhs: Operable<number> | number, rhs: Operable<number>, result: RealNumberTypes | undefined): Filter;
export function mod(lhs: Operable<number> | number, rhs: Operable<number> | number, result: RealNumberTypes | undefined): Filter {
    return arithmeticInfixOp(lhs, "mod", rhs, result);
}

export function ceiling(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return functionCall("ceiling", [operableToFilter(lhs)], result || int32T)
}

export function floor(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return functionCall("floor", [operableToFilter(lhs)], result || int32T)
}

export function round(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return functionCall("round", [operableToFilter(lhs)], result || int32T)
}