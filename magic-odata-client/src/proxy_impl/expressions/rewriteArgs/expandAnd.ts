import { ODataTypeRef } from "../../../../index.js"
import { ReaderWriter, removeNulls } from "../../../utils.js"
import { AtParam, rawType } from "../../../valueSerializer.js"
import { dir, entity } from "../../uriBuilder/utils.js"
import { buildRecorder } from "../../uriEvents/eventBuilder.js"
import { ConstExpression } from "../constExpression.js"
import { Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { FunctionSignatureContainer } from "../functionSignatureContainer.js"
import { RewriteFunctionArg } from "../functionSignatures.js"
import { UntypedCall } from "../untypedCall.js"
import { ApplyRewriteArgTools, RewriteArg } from "./callExpressionRewriteArgs.js"


// function applyExpandAnd(tools: ApplyRewriteTools, callExpression: UntypedCall, thisArgIndex: number): ReaderWriter<MappingUtils, ReWriteResult, [AtParam, ODataTypeRef][]> {

//     const firstArgArg = callExpression.args[0]
//     const thisArg = callExpression.args[thisArgIndex]
//     if (thisArgIndex !== 1
//         || !thisArg
//         || !isRewriteArg(thisArg.sig, "ExpandAnd")
//         || thisArg.expr[expressionType] !== "Const"
//         || typeof thisArg.expr.value !== "function"
//         || thisArg.expr.returnType instanceof FunctionSignatureContainer
//         || !firstArgArg.expr.returnType
//         || firstArgArg.expr.returnType instanceof FunctionSignatureContainer) {

//         throw new Error(`Expected an ExpandAnd arg: ${describeSignature(callExpression.signature, true)}`)
//     }

//     const innerType = firstArgArg.expr.returnType.isCollection
//         ? firstArgArg.expr.returnType.collectionType
//         : firstArgArg.expr.returnType

//     return tools.expressionTools
//         .asExpression(null, thisArg.expr.value(buildRecorder(entity, "$this")))
//         .mapEnv<MappingUtils>(utils => ({ utils, queryType: innerType }))
//         .map(x => {
//             if (!x) throw new Error(err());

//             const root = tools.expressionTools.findRoot(x)
//             if (!root) throw new Error(err());

//             return {
//                 type: "ReplacedCall",
//                 expr: tools.expressionTools.buildReContexted(
//                     tools.expressionTools.buildNamedQuery(root, x), "$this")
//             }
//         })

//     function err() { return `Invalid expression for "${thisArg.sig.name}" parameter` }
// }

function isConstFunction(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "function"
}

/** Expand clause, expand clause return type, and claues */
type RewritePacket = [Expression, ODataTypeRef, Function[]]

export const expandAnd: RewriteArg<RewritePacket> = {
    type: "ExpandAnd",

    canProcess: (sig: RewriteFunctionArg, expr: Expression, call: UntypedCall, index: number) => {

        const previousArg = index > 0 && call.args[index - 1]
        if (!previousArg
            || !previousArg.expr.returnType
            || previousArg.expr.returnType instanceof FunctionSignatureContainer) return null

        if (!isConstFunction(expr)) return null
        const allAnds = removeNulls(call.args
            .filter((_, i) => i >= index)
            .map(a =>
                a.sig.type === "Rewrite"
                    && a.sig.descriptor.type === "ExpandAnd"
                    && isConstFunction(a.expr)
                    ? a.expr
                    : null))

        return [previousArg.expr, previousArg.expr.returnType, allAnds.map(x => x.value)]
    },

    isArg: isConstFunction,

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {
        const [expand, t, ands] = processArg

        const innerType = t.isCollection
            ? t.collectionType
            : t

        return ReaderWriter.traverse(
            ands.map(and => ReaderWriter.bindCreate((env: ApplyRewriteArgTools) => env.tools.expressionTools
                .asExpression(null, and(buildRecorder(entity, "$this")))
                .map(x => {
                    if (!x) throw new Error(err());
                    return x
                })
                .mapEnv<ApplyRewriteArgTools>(utils => ({ utils: utils.mappingUtils, queryType: innerType })))), [])
            .bind(ands => ReaderWriter.create(env => {

                const andExpressions = ands
                    .map(and => {
                        const root = env.tools.expressionTools.findRoot(and)
                        if (!root) {
                            throw new Error(err());
                        }

                        return env.tools.expressionTools.buildReContexted(
                            env.tools.expressionTools.buildNamedQuery(root, and), "$this")
                    })
                    .flatMap((x, i) => i === 0 ? [x] : [",", x])

                return [{
                    type: "ReplacedCall",
                    expr: env.tools.expressionTools.buildStringBuilder(null, [
                        expand,
                        "(",
                        env.tools.expressionTools
                            .buildStringBuilder(null, andExpressions, rawType),
                        ")"],
                        t)
                }, []]
            }))

        function err() { return `Invalid expression for "${expr.args[index].sig.name}" parameter` }
    }
}