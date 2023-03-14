import { ODataCollectionTypeRef } from "magic-odata-shared"
import { ODataTypeRef } from "../../../../index.js"
import { NonNumericTypes, OutputTypes, resolveOutputType } from "../../../query/filtering/queryPrimitiveTypes0.js"
import { ReaderWriter } from "../../../utils.js"
import { AtParam } from "../../../valueSerializer.js"
import { dirFn, entity, MappingUtils } from "../../uriBuilder/utils.js"
import { buildRecorder, isRecorderArray, Recorder } from "../../uriEvents/eventBuilder.js"
import { buildConst, ConstExpression } from "../constExpression.js"
import { asExpression, Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { FunctionSignatureContainer } from "../functionSignatureContainer.js"
import { changeSignatureReturnType, RewriteFunctionArg } from "../functionSignatures.js"
import { buildStringBuilder } from "../stringBuilderExpression.js"
import { buildUntypedCall, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { ApplyRewriteArgTools, RewriteArg, ReWriteResult } from "./callExpressionRewriteArgs.js"

// function logicalCollectionOpArg(tools: ExpressionTools, expr: UntypedCall, thisArgIndex: number): ReaderWriter<MappingUtils, ReWriteResult, [AtParam, ODataTypeRef][]> {

//     if (thisArgIndex !== 1) {
//         throw new Error(`Expected a function arg for LogicalCollectionOp (e1): ${describeSignature(expr.signature, true)}`);
//     }

//     if (expr.args.length !== 2) {
//         throw new Error(`Expected a function arg for LogicalCollectionOp (e1): ${describeSignature(expr.signature, true)}`);
//     }

//     const thisArg = expr.args[thisArgIndex]
//     if (!thisArg
//         || thisArg.expr[expressionType] !== "Const"
//         || typeof thisArg.expr.value !== "function"
//         || thisArg.sig.type !== "Rewrite"
//         || thisArg.sig.descriptor.type !== "LogicalCollectionOp") {
//         throw new Error(`Expected a function arg for LogicalCollectionOp (e2): ${describeSignature(expr.signature, true)}`)
//     }

//     const collectionArg = expr.args[0]
//     if (!collectionArg
//         || !collectionArg.expr.returnType
//         || collectionArg.expr.returnType instanceof FunctionSignatureContainer
//         || !collectionArg.expr.returnType.isCollection) {
//         throw new Error(`Expected a function arg for LogicalCollectionOp (e3): ${describeSignature(expr.signature, true)}`)
//     }

//     const alias = uniqueString()
//     const e = buildRecorder(entity, alias)
//     let builderResult: Recorder | Recorder[] | boolean = thisArg.expr.value(e)

//     if (isRecorderArray(builderResult)) {
//         if (builderResult.length > 1) {
//             throw new Error('Invalid result of "any" or "all" mapping function');
//         }

//         builderResult = builderResult[0]
//     }

//     const queryType = collectionArg.expr.returnType.collectionType
//     const innerExp = typeof builderResult === "boolean"
//         ? ReaderWriter.retn(buildConst(builderResult, boolT), [])   // TODO: add test for typeof builderResult === "boolean"
//         : asExpression(null, builderResult)
//             .mapEnv<MappingUtils>(utils => ({ utils, queryType }))

//     return innerExp
//         .map(innerExpr => {
//             if (!innerExpr) {
//                 throw new Error('Invalid result of "any" or "all" mapping function');
//             }

//             return {
//                 type: "ReplacedCall",
//                 expr: buildStringBuilder(
//                     tools.findParent(collectionArg.expr),
//                     [
//                         collectionArg.expr,
//                         `/${expr.signature.name}(${alias}:`,
//                         innerExpr,
//                         ")"
//                     ], boolT)
//             }
//         })
// }

const uniqueString = (function () {
    let current = [0]
    const chars = "abcdefghijklmnopqrstuvwxyz"

    function increment(index: number) {
        if (index < 0) {
            if (current.length > 5) {
                current.splice(0, current.length)
            }

            current.push(0)
            return
        }

        if (current[index] < 25) {
            current[index]++
            return
        }

        current[index] = 0
        increment(index - 1)
    }

    return () => {

        const next = current.map(x => chars[x]).join("")
        increment(current.length - 1)

        return next
    }
}())

const boolT = resolveOutputType(NonNumericTypes.Boolean)

function isConstFunction(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "function"
}

/** (Collection type, collection, mapper) */
type RewritePacket = [ODataCollectionTypeRef, Expression, Function]

export const logicalCollectionOp: RewriteArg<RewritePacket> = {
    type: "LogicalCollectionOp",

    canProcess: (sig: RewriteFunctionArg, expr: Expression, call: UntypedCall, index: number) => {

        const fn = sig.descriptor.type === "LogicalCollectionOp" && isConstFunction(expr)
            ? expr.value
            : null

        if (!fn) return null

        const collectionArg = index > 0 && call.args[index - 1]
        if (!collectionArg) return null

        const collectionType =
            collectionArg.expr.returnType
                && !(collectionArg.expr.returnType instanceof FunctionSignatureContainer)
                && collectionArg.expr.returnType.isCollection
                ? collectionArg.expr.returnType
                : null

        return collectionType && [collectionType, collectionArg.expr, fn]
    },

    isArg: isConstFunction,

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {

        const [collectionType, collectionArg, fn] = processArg
        const alias = uniqueString()
        const e = buildRecorder(entity, alias)
        let builderResult: Recorder | Recorder[] | boolean = fn(e)

        if (isRecorderArray(builderResult)) {
            if (builderResult.length > 1) {
                throw new Error('Invalid result of "any" or "all" mapping function');
            }

            builderResult = builderResult[0]
        }

        const innerExp = typeof builderResult === "boolean"
            ? ReaderWriter.retn(buildConst(builderResult, boolT), [])   // TODO: add test for typeof builderResult === "boolean"
            : asExpression(null, builderResult)
                .mapEnv<ApplyRewriteArgTools>(utils => ({ utils: utils.mappingUtils, queryType: collectionType.collectionType }))

        return innerExp
            .bind(innerExpr => {
                if (!innerExpr) {
                    throw new Error('Invalid result of "any" or "all" mapping function');
                }

                return ReaderWriter.create(env => [{
                    type: "ReplacedCall",
                    expr: buildStringBuilder(
                        env.tools.expressionTools.findParent(collectionArg),
                        [
                            collectionArg,
                            `/${expr.signature.name}(${alias}:`,
                            innerExpr,
                            ")"
                        ], boolT)
                }, []])
            })
    }
}