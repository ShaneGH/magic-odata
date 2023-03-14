import { ODataTypeRef } from "../../../../index.js"
import { ReaderWriter } from "../../../utils.js"
import { AtParam, rawType } from "../../../valueSerializer.js"
import { asExpression, Expression, ExpressionMappingUtils } from "../expressions.js"
import { expressionType } from "../expressionType.js"
import { buildSignature, FunctionArg, RewriteFunctionArg } from "../functionSignatures.js"
import { buildUntypedCall, UntypedCall } from "../untypedCall.js"
import { ApplyRewriteArgTools, RewriteArg } from "./callExpressionRewriteArgs.js"

// function applyOrderByArgs(tools: ApplyRewriteTools, expr: UntypedCall): ReaderWriter<MappingUtils, UntypedCall, [AtParam, ODataTypeRef][]> {

//     //    throw new Error("Maybe simplify with a string builder arg")
//     return ReaderWriter.traverse(expr.args
//         .map<ReaderWriter<ExpressionMappingUtils, CallExpressionArg, [AtParam, ODataTypeRef][]>>(x => {

//             if (!isRewriteArg(x.sig, "OrderBy")) {
//                 return ReaderWriter.retn(x, [])
//             }

//             const rawSignatureArg = rawFunctionSigArg(x.sig.name)
//             if (x.expr[expressionType] !== "Const"
//                 || !Array.isArray(x.expr.value)
//                 || x.expr.value.length !== 2) {
//                 return ReaderWriter.retn({ ...x, sig: rawSignatureArg }, [])
//             }

//             let [prop, direction] = x.expr.value
//             return asExpression(null, prop)
//                 .bind(prop => asExpression(null, direction)
//                     .bind(direction => direction
//                         ? tools.expressionTools.changeReturnType(direction, rawType)
//                         : ReaderWriter.retn(direction, []))
//                     .map(direction => [prop, direction]))
//                 .bind(args => tools.expressionTools
//                     .buildCall(
//                         buildUntypedCall(joinWithSpaceParent, removeNulls(args), joinWithSpace, {})))
//                 .map(expr => ({
//                     expr,
//                     sig: rawSignatureArg
//                 }))
//         }), [])
//         .mapEnv((utils: MappingUtils) => ({ utils, queryType: tools.queryType }))
//         .map(args => {
//             const signature = buildSignature(
//                 expr.signature.name,
//                 args.map(({ sig }) => sig),
//                 rawType,
//                 expr.signature.callDetails,
//                 expr.signature)

//             return buildUntypedCall(
//                 expr.this,
//                 args.map(({ expr }) => expr),
//                 signature,
//                 {})
//         })
// }

function rawFunctionSigArg(name: string): FunctionArg {
    return {
        type: "Normal",
        name,
        argType: {
            type: "TypeRef",
            // TODO: should not be creating type ref here
            typeRef: { isCollection: false, namespace: "", name: "any" }
        },
        modifier: null
    }
}

// const joinWithSpace = buildSignature(
//     "joinWords",
//     [{
//         type: "Normal",
//         name: "x",
//         // TODO: should not be creating type ref here
//         argType: { type: "TypeRef", typeRef: { isCollection: false, namespace: "", name: "any" } },
//         modifier: null
//     }, {
//         type: "Normal",
//         name: "y",
//         // TODO: should not be creating type ref here
//         argType: { type: "TypeRef", typeRef: rawType },
//         modifier: null
//     }],
//     rawType,
//     { type: "Infix", operator: " " },
//     null)

// const joinWithSpaceParent = buildRootSymbol(Symbol("joinWithSpaceParent"), null, new FunctionSignatureContainer([joinWithSpace]))


function asOrderBy(arg: Expression): ReaderWriter<ExpressionMappingUtils, OrderByArg, [AtParam, ODataTypeRef][]> | null {
    if (arg[expressionType] !== "Const") return ReaderWriter.retn([arg, null], [])

    if (!Array.isArray(arg.value)
        || arg.value.length !== 2
        || (arg.value[1] !== "desc" && arg.value[1] !== "asc")) return null

    return asExpression(null, arg.value[0])
        .map(x => {
            if (!x) throw new Error("Invalid order by arg")
            return [x, arg.value[1]] as OrderByArg
        })
}

type OrderByArg = [Expression, "asc" | "desc" | null]

type RewritePacket = ReaderWriter<ExpressionMappingUtils, OrderByArg[], [AtParam, ODataTypeRef][]>

export const orderBy: RewriteArg<RewritePacket> = {
    type: "OrderBy",

    canProcess: (sig: RewriteFunctionArg, expr: Expression, call: UntypedCall) => {

        const args = call.args.reduce(
            (s, x) => {
                if (!s) return null
                const result = asOrderBy(x.expr)
                if (!result) return null
                return [...s, result]
            }, [] as ReaderWriter<ExpressionMappingUtils, OrderByArg, [AtParam, ODataTypeRef][]>[] | null)

        if (args === null) return null

        return ReaderWriter.traverse(args, [])
    },

    isArg: (x) => !!asOrderBy(x),

    process: (expr: UntypedCall, index: number, processArg: RewritePacket) => {

        return ReaderWriter.bindCreate(env => {

            return processArg
                .mapEnv<ApplyRewriteArgTools>(env => ({ utils: env.mappingUtils, queryType: env.tools.queryType }))
                .bind(args => {

                    const argsAsExpr = args.map(([arg, direction]) => {
                        if (!direction) return arg
                        return env.tools.expressionTools.buildStringBuilder(
                            null,
                            [arg, ` ${direction}`],
                            rawType)
                    })

                    const signature = buildSignature(
                        expr.signature.name,
                        argsAsExpr.map((_, i) => rawFunctionSigArg(`orderBy[${i}]`)),
                        rawType,
                        expr.signature.callDetails,
                        expr.signature)

                    return ReaderWriter.retn({
                        type: "RewrittenCall",
                        call: buildUntypedCall(
                            expr.this,
                            argsAsExpr,
                            signature,
                            {})
                    }, []);
                })
        })
    }
}