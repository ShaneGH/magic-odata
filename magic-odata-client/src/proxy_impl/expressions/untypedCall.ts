import { ODataTypeRef } from "magic-odata-shared";
import { zip } from "../../utils.js";
import { Expression } from "./expressions.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";
import { changeSignatureReturnType, FunctionArg, FunctionSignature, GenericTokenMap, insertSignatureArgs, removeSignatureArgs } from "./functionSignatures.js";
import { rewriteSignatureMatches } from "./rewriteArgs/callExpressionRewriteArgs.js";

export type CallExpressionArg = { sig: FunctionArg, expr: Expression }

/** 
 * A CallExpression that can be built with types which are unasignable
 */
export type UntypedCall = {
    this: Expression | null,
    args: CallExpressionArg[],
    signature: FunctionSignature,
    genericTokens: GenericTokenMap
}

export function buildUntypedCall(
    thisArg: Expression | null,
    args: Expression[],
    signature: FunctionSignature,
    genericTokens: GenericTokenMap): UntypedCall {

    const fArgs = zip(args, signature.inputArgs)
        .map(([arg, sig]) => {
            if (!arg || !sig) throw new Error(`Arg number mismatch for function call "${signature.name}"`)

            if (arg.returnType instanceof FunctionSignatureContainer) {
                throw new Error(`Arg ${sig.name} does not have a concrete value`)
            }

            if (sig.type === "Rewrite" && arg.returnType && !rewriteSignatureMatches(sig, arg)) {
                throw new Error(`Arg ${sig.name} does not match rewrite signature`)
            }

            return { expr: arg, sig }
        })

    return {
        this: thisArg,
        args: fArgs,
        signature,
        genericTokens
    }
}

export function removeUntypedFunctionArgs(expr: UntypedCall, ...indexes: number[]): UntypedCall {

    for (let i = 0; i < indexes.length; i++) {
        if (expr.args.length <= indexes[i]) {
            throw new Error(`Arg index ${indexes[i]} out of range for function ${expr.signature.name}`)
        }
    }

    const args = expr.args
        .filter((_, i) => indexes.indexOf(i) === -1)
        .map(({ expr }) => expr)

    return buildUntypedCall(expr.this, args, removeSignatureArgs(expr.signature, ...indexes), expr.genericTokens)
}

export function insertUntypedFunctionArg(expr: UntypedCall, index: number, expression: Expression, signature: FunctionArg): UntypedCall {
    return insertUntypedFunctionArgs(expr, index, [expression, signature])
}

export function insertUntypedFunctionArgs(expr: UntypedCall, index: number, ...args: [Expression, FunctionArg][]): UntypedCall {
    if (index > expr.args.length) {
        throw new Error("Index out of range")
    }

    const sig = insertSignatureArgs(expr.signature, index, ...args.map(([, x]) => x))
    const as = [
        ...expr.args.slice(0, index).map(({ expr }) => expr),
        ...args.map(([x]) => x),
        ...expr.args.slice(index).map(({ expr }) => expr)
    ]

    return buildUntypedCall(expr.this, as, sig, expr.genericTokens)
}

export function changeUntypedCallReturnType(expr: UntypedCall, returnType: ODataTypeRef): UntypedCall {

    const args = expr.args
        .map(({ expr }) => expr)

    return buildUntypedCall(expr.this, args, changeSignatureReturnType(expr.signature, returnType), expr.genericTokens)
}

export function changeUntypedCallThisValue(expr: UntypedCall, thisValue: Expression): UntypedCall {

    const args = expr.args
        .map(({ expr }) => expr)

    return buildUntypedCall(thisValue, args, expr.signature, expr.genericTokens)
}
