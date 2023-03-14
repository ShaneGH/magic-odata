import { OutputTypes, resolveOutputType } from "../../../query/filtering/queryPrimitiveTypes0.js"
import { ReaderWriter } from "../../../utils.js"
import { ConstExpression } from "../constExpression.js"
import { Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { changeSignatureReturnType, RewriteFunctionArg } from "../functionSignatures.js"
import { buildUntypedCall, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { RewriteArg } from "./callExpressionRewriteArgs.js"

function isConstString(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "string"
}

type RewritePacket = ["OutputTypes" | "RealNumberTypes", OutputTypes]

export const outputType: RewriteArg<RewritePacket> = {
    type: "OutputType",

    canProcess: (sig: RewriteFunctionArg, expr: Expression) => {

        return sig.descriptor.type === "OutputType" && isConstString(expr)
            ? [sig.descriptor.outputEnum, expr.value]
            : null
    },

    isArg: isConstString,

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {
        expr = removeUntypedFunctionArgs(expr, index)
        const signature = changeSignatureReturnType(expr.signature, resolveOutputType(processArg[1]))
        const call = buildUntypedCall(expr.this, expr.args.map(({ expr }) => expr), signature, expr.genericTokens)

        return ReaderWriter.retn({ type: "RewrittenCall", call }, [])
    }
}