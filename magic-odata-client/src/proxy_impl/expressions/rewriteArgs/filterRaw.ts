import { ODataTypeRef } from "../../../../index.js"
import { Dict, ReaderWriter, removeNulls } from "../../../utils.js"
import { AtParam, rawType } from "../../../valueSerializer.js"
import { evaluateExpression } from "../../uriBuilder/expressionEvaluator.js"
import { MappingUtils } from "../../uriBuilder/utils.js"
import { ConstExpression } from "../constExpression.js"
import { Expression } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { FunctionArg, RewriteFunctionArg } from "../functionSignatures.js"
import { RootSymbolExpression } from "../rootSymbolExpression.js"
import { CallExpressionArg, insertUntypedFunctionArg, removeUntypedFunctionArgs, UntypedCall } from "../untypedCall.js"
import { ApplyRewriteArgTools, RewriteArg, ReWriteResult } from "./callExpressionRewriteArgs.js"

function isConstObj(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "object"
}

function isConstFunction(arg: Expression): arg is ConstExpression {
    return arg[expressionType] === "Const" && typeof arg.value === "function"
}

export const filterRawExecutor: RewriteArg<Function> = {
    type: "FilterRawExecutor",

    canProcess: (sig: RewriteFunctionArg, expr: Expression) => {

        return sig.descriptor.type === "FilterRawExecutor" && isConstFunction(expr)
            ? expr.value
            : null
    },

    isArg: isConstFunction,

    process: () => {
        // filterRawProps rewrite should be called before this, which will remove the arg
        // in question
        throw new Error("Unexpected error")
    }

}

type RewritePacket = [object, Function]

export const filterRawProps: RewriteArg<RewritePacket> = {
    type: "FilterRawProps",

    canProcess: (sig: RewriteFunctionArg, expr: Expression, call: UntypedCall, index: number) => {

        const obj = sig.descriptor.type === "FilterRawProps" && isConstObj(expr)
            ? expr.value
            : null

        if (!obj) return null
        const executorArg = call.args[index + 1];
        if (!executorArg) return null

        const executor = executorArg.sig.type === "Rewrite"
            && filterRawExecutor.canProcess(executorArg.sig, executorArg.expr, call, index + 1)
        if (!executor) return null

        return [obj, executor]
    },

    isArg: isConstObj,

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {

        const filterArgT = removeNulls(
            expr.args
                .map((x, i) => [i, x] as [number, CallExpressionArg])
                .slice(index + 1)
                .map(([i, x]) => x.expr[expressionType] === "Const"
                    && typeof x.expr.value === "function"
                    ? [i, x.expr.value] as [number, Function]
                    : null))

        if (!filterArgT.length) {
            throw new Error("Unexpected FilterRawExecutor arg for filter")
        }

        const filterArgIndex = index + 1
        const [obj, filterArg] = processArg

        return ReaderWriter.bindCreate<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]>(env => {

            const emptyParams = ReaderWriter
                .retn<MappingUtils, Dict<string | null>, [AtParam, ODataTypeRef][]>({}, [])

            return Object
                .keys(obj)
                .reduce((s, x) => s
                    .bind(s => env.tools.expressionTools
                        .asExpression(null, (obj as any)[x])
                        .mapEnv((utils: MappingUtils) => ({ utils, queryType: env.tools.queryType }))
                        .bind(expr => expr
                            ? evaluateExpression(expr)
                            : ReaderWriter.retn([null, null] as [RootSymbolExpression | null, string | null], []))
                        .map(([, xV]) => ({ ...s, [x]: xV }))), emptyParams)
                .map(params => {
                    const newArg = env.tools.expressionTools.buildConst(filterArg(params), rawType)
                    const newSig: FunctionArg = {
                        type: "Normal",
                        name: "filter",
                        argType: { type: "TypeRef", typeRef: rawType },
                        modifier: null
                    }

                    const expr1 = removeUntypedFunctionArgs(expr, index, filterArgIndex)
                    return insertUntypedFunctionArg(expr1, index, newArg, newSig)
                })
                .mapEnv<ApplyRewriteArgTools>(env1 => env1.mappingUtils)
                .map(call => ({ type: "RewrittenCall", call }))
        })
    }
}