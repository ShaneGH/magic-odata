import { OutputTypes, resolveOutputType } from "../../../query/filtering/queryPrimitiveTypes0.js"
import { ReaderWriter } from "../../../utils.js"
import { rawType } from "../../../valueSerializer.js"
import { querySymbols } from "../../inbuiltFunctions/functions.js"
import { ConstExpression } from "../constExpression.js"
import { Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { changeSignatureReturnType, RewriteFunctionArg } from "../functionSignatures.js"
import { buildRootSymbol } from "../rootSymbolExpression.js"
import { buildUntypedCall, changeUntypedCallThisValue, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { RewriteArg } from "./callExpressionRewriteArgs.js"


// function applyCustomQueryOpArg(expr: UntypedCall, thisArgIndex: number): UntypedCall {
//     const thisArg = expr.args[thisArgIndex]
//     if (!thisArg
//         || thisArg.expr[expressionType] !== "Const"
//         || typeof thisArg.expr.value !== "string"
//         || !isRewriteArg(thisArg.sig, "CustomQueryArg")
//         || typeof thisArg.expr.value !== "string") {
//         throw new Error(`Expected a CustomQueryArg arg: ${describeSignature(expr.signature, true)}`)
//     }

//     const newThis = buildRootSymbol(
//         querySymbols.custom,
//         thisArg.expr.value, rawType)

//     expr = removeUntypedFunctionArgs(expr, thisArgIndex)
//     expr = changeUntypedCallThisValue(expr, newThis)
//     return buildUntypedCall(expr.this, expr.args.map(({ expr }) => expr), expr.signature, expr.genericTokens)
// }

function isConstString(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "string"
}

export const customQuery: RewriteArg<string> = {
    type: "CustomQueryArg",

    canProcess: (sig: RewriteFunctionArg, expr: Expression) => {

        return sig.descriptor.type === "CustomQueryArg" && isConstString(expr)
            ? expr.value
            : null
    },

    isArg: isConstString,

    process: (expr: UntypedCall, index: number, processArg: string) => {
        const newThis = buildRootSymbol(
            querySymbols.custom,
            processArg, rawType)

        expr = removeUntypedFunctionArgs(expr, index)
        expr = changeUntypedCallThisValue(expr, newThis)
        const call = buildUntypedCall(expr.this, expr.args.map(({ expr }) => expr), expr.signature, expr.genericTokens)

        return ReaderWriter.retn({ type: "RewrittenCall", call }, [])
    }
}