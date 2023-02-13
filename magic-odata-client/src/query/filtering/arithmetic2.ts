import { Filter } from "../../queryBuilder.js";
import { infixOp, MappableType } from "./op1.js";
import { combineFilterStrings, getOperableFilterString, getOperableTypeInfo, Operable } from "./operable0.js";
import { DecimalNumberTypes, IntegerTypes, RealNumberTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const int32T = resolveOutputType(IntegerTypes.Int32)

const integerTypes = Object.keys(IntegerTypes);
function isInteger(item: Operable<number> | number) {

    if (typeof item === "number") {
        return Number.isInteger(item);
    }

    const metadata = getOperableTypeInfo(item)
    return metadata.typeRef
        && !metadata.typeRef.isCollection
        && metadata.typeRef.namespace === "Edm"
        && integerTypes.indexOf(metadata.typeRef.name) !== -1
}

function guessAritmeticOutputType(
    lhs: Operable<number>, operator: string, rhs: Operable<number> | number): RealNumberTypes {

    return operator === "div" || operator === "divby" || !isInteger(lhs) || !isInteger(rhs)
        ? DecimalNumberTypes.Double
        : IntegerTypes.Int64;
}

/** 
 * an operation with 2 nummeric inputs which return a number
 */
function arithmeticInfixOp(
    lhs: Operable<number> | number,
    operator: string,
    rhs: Operable<number> | number,
    result: RealNumberTypes | undefined): Filter {

    let reverse = false
    if (typeof lhs === "number") {
        if (typeof rhs === "number") {
            throw new Error("Invalid method overload");
        }

        reverse = true;
        [lhs, rhs] = [rhs, lhs]
    }

    const mappableRhs = typeof rhs === "number"
        ? new MappableType<number>(rhs, x => x.toString())
        : rhs;

    const outputT = resolveOutputType(result || guessAritmeticOutputType(lhs, operator, rhs))
    return infixOp(lhs, operator, mappableRhs, outputT, reverse)
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

function roundingFunctionCall(
    functionName: string,
    lhs: Operable<number>,
    result: IntegerTypes | undefined): Filter {

    const metadata = getOperableTypeInfo(lhs);
    const lhsS = getOperableFilterString(lhs)
    const resultT = (result && resolveOutputType(result)) || int32T

    return combineFilterStrings("", resultT, metadata.root, `${functionName}(${lhsS})`);
}

export function ceiling(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return roundingFunctionCall("ceiling", lhs, result);
}

export function floor(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return roundingFunctionCall("floor", lhs, result);
}

export function round(lhs: Operable<number>, result?: IntegerTypes | undefined): Filter {
    return roundingFunctionCall("round", lhs, result);
}