import { ODataTypeRef } from "../../../../index.js"
import { ReaderWriter } from "../../../utils.js"
import { Expression } from "../expressions.js"
import { FunctionSignatureContainer } from "../functionSignatureContainer.js"
import { FunctionArg, RewriteFunctionArg } from "../functionSignatures.js"
import { insertUntypedFunctionArg, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { RewriteArg } from "./callExpressionRewriteArgs.js"


// function applyExpandCount(tools: ApplyRewriteTools, expr: UntypedCall, thisArgIndex: number): UntypedCall {

//     const thisArg = expr.args[thisArgIndex]
//     if (!thisArg
//         || !isRewriteArg(thisArg.sig, "ExpandCount")
//         || !thisArg.expr.returnType
//         || thisArg.expr.returnType instanceof FunctionSignatureContainer) {
//         throw new Error(`Expected an ExpandCount arg: ${describeSignature(expr.signature, true)}`)
//     }

//     const count = tools.expressionTools.buildProp(thisArg.expr, "$count", thisArg.expr.returnType)
//     const countSig = expandCountRewrittenSig(thisArg.expr.returnType)

//     return insertUntypedFunctionArg(
//         removeUntypedFunctionArgs(expr, thisArgIndex), thisArgIndex, count, countSig)
// }

function hasReturnType(arg: Expression): ODataTypeRef | null {
    return arg.returnType && !(arg.returnType instanceof FunctionSignatureContainer)
        ? arg.returnType
        : null
}

type RewritePacket = [Expression, ODataTypeRef]

function expandCountRewrittenSig(generic: ODataTypeRef): FunctionArg {
    return {
        type: "Normal",
        name: "obj",
        argType: { type: "TypeRef", typeRef: generic },
        modifier: null
    }
}

export const expandCount: RewriteArg<RewritePacket> = {
    type: "ExpandCount",

    canProcess: (sig: RewriteFunctionArg, expr: Expression) => {
        const t = hasReturnType(expr)
        if (!t) return null

        return [expr, t]
    },

    isArg: x => !!hasReturnType(x),

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {
        return ReaderWriter.create(env => {

            const [arg, t] = processArg
            const count = env.tools.expressionTools.buildProp(arg, "$count", t)
            const countSig = expandCountRewrittenSig(t)

            return [{
                type: "RewrittenCall",
                call: insertUntypedFunctionArg(
                    removeUntypedFunctionArgs(expr, index), index, count, countSig)
            }, []]
        });
    }
}