import { ODataTypeRef } from "../../../../index.js"
import { ReaderWriter } from "../../../utils.js"
import { AtParam, rawType } from "../../../valueSerializer.js"
import { ConstExpression } from "../constExpression.js"
import { Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { buildSignature, RewriteFunctionArg, SignatureParamType } from "../functionSignatures.js"
import { buildUntypedCall, CallExpressionArg, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { ApplyRewriteArgTools, RewriteArg, ReWriteResult } from "./callExpressionRewriteArgs.js"


// function applyMapperArg(tools: ExpressionTools, expr: UntypedCall, thisArgIndex: number): UntypedCall {

//     let f: Function
//     const thisArg = expr.args[thisArgIndex]
//     if (!thisArg
//         || thisArg.expr[expressionType] !== "Const"
//         || typeof (f = thisArg.expr.value) !== "function"
//         || thisArg.sig.type !== "Rewrite"
//         || thisArg.sig.descriptor.type !== "Mapper") {
//         throw new Error(`Expected a function arg for Mapper: ${describeSignature(expr.signature, true)}`)
//     }

//     const forType = thisArg.sig.descriptor.forType
//     const mapperIsForArray = forType.type === "TypeRef" && forType.typeRef.isCollection
//     expr = removeUntypedFunctionArgs(expr, thisArgIndex)
//     const rewriteArgs = expr.signature.inputArgs.map((x, i) => x.type === "Rewrite" ? i : -1)
//     const args: CallExpressionArg[] = expr.args
//         .map((arg, i) => {
//             if (rewriteArgs.indexOf(i) !== -1 || arg.expr[expressionType] !== "Const") {
//                 return arg
//             }

//             const mappedIsForArray = arg.sig.type === "Normal"
//                 && arg.sig.argType.type === "TypeRef"
//                 && arg.sig.argType.typeRef.isCollection

//             return {
//                 sig: arg.sig.type === "Normal"
//                     ? {
//                         ...arg.sig,
//                         argType: {
//                             type: "TypeRef",
//                             typeRef: rawType
//                         }
//                     }
//                     : arg.sig,
//                 expr: tools.buildConst(
//                     mappedIsForArray && !mapperIsForArray && Array.isArray(arg.expr.value)
//                         ? `[${arg.expr.value.map(f as any)}]`
//                         : f(arg.expr.value),
//                     rawType)
//             }
//         })

//     const sig = buildSignature(
//         expr.signature.name,
//         args.map(x => x.sig),
//         expr.signature.outputType,
//         expr.signature.callDetails,
//         expr.signature)

//     return buildUntypedCall(expr.this, args.map(x => x.expr), sig, expr.genericTokens)
// }

function isConstFunction(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "function"
}

type RewritePacket = [SignatureParamType, Function]

export const mapper: RewriteArg<RewritePacket> = {
    type: "Mapper",

    canProcess: (sig: RewriteFunctionArg, expr: Expression) => {

        return sig.descriptor.type === "Mapper" && isConstFunction(expr)
            ? [sig.descriptor.forType, expr.value]
            : null
    },

    isArg: isConstFunction,

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {

        const [forType, mapper] = processArg
        const mapperIsForArray = forType.type === "TypeRef" && forType.typeRef.isCollection
        expr = removeUntypedFunctionArgs(expr, index)

        const rewriteArgs = expr.signature.inputArgs.map((x, i) => x.type === "Rewrite" ? i : -1)

        return ReaderWriter.create<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]>(env => {
            const args: CallExpressionArg[] = expr.args
                .map((arg, i) => {
                    if (rewriteArgs.indexOf(i) !== -1 || arg.expr[expressionType] !== "Const") {
                        return arg
                    }

                    const mappedIsForArray = arg.sig.type === "Normal"
                        && arg.sig.argType.type === "TypeRef"
                        && arg.sig.argType.typeRef.isCollection

                    return {
                        sig: arg.sig.type === "Normal"
                            ? {
                                ...arg.sig,
                                argType: {
                                    type: "TypeRef",
                                    typeRef: rawType
                                }
                            }
                            : arg.sig,
                        expr: env.tools.expressionTools.buildConst(
                            mappedIsForArray && !mapperIsForArray && Array.isArray(arg.expr.value)
                                ? `[${arg.expr.value.map(mapper as any)}]`
                                : mapper(arg.expr.value),
                            rawType)
                    }
                })

            const sig = buildSignature(
                expr.signature.name,
                args.map(x => x.sig),
                expr.signature.outputType,
                expr.signature.callDetails,
                expr.signature)

            return [{
                type: "RewrittenCall",
                call: buildUntypedCall(expr.this, args.map(x => x.expr), sig, expr.genericTokens)
            }, []]
        });
    }
}