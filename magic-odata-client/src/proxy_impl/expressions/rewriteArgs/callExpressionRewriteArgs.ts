import { ODataTypeRef } from "../../../../index.js"
import { filterRaw } from "../../../query/filtering/op1.js"
import { ReaderWriter, removeNulls } from "../../../utils.js"
import { AtParam } from "../../../valueSerializer.js"
import { MappingUtils } from "../../uriBuilder/utils.js"
import { Expression, ExpressionTools } from "../expressions.js"
import { FunctionArg, FunctionSignature, RewriteFunctionArg } from "../functionSignatures.js"
import { UntypedCall } from "../untypedCall.js"
import { customQuery } from "./customQuery.js"
import { expandAnd } from "./expandAnd.js"
import { expandCount } from "./expandCount.js"
import { filterRawExecutor, filterRawProps } from "./filterRaw.js"
import { logicalCollectionOp } from "./logicalCollectionOp.js"
import { mapper } from "./mapper.js"
import { orderBy } from "./orderBy.js"
import { outputType } from "./outputType.js"

// function isRewriteArg(arg: FunctionArg, argType: "Mapper" | "OutputType" | "FilterRawProps" | "FilterRawExecutor" | "CustomQueryArg" | "OrderBy" | "ExpandCount" | "ExpandAnd"): arg is RewriteFunctionArg {
//     return arg.type === "Rewrite" && arg.descriptor.type === argType
// }

// const boolT = resolveOutputType(NonNumericTypes.Boolean)

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

// // const joinWithSpace = buildSignature(
// //     "joinWords",
// //     [{
// //         type: "Normal",
// //         name: "x",
// //         // TODO: should not be creating type ref here
// //         argType: { type: "TypeRef", typeRef: { isCollection: false, namespace: "", name: "any" } },
// //         modifier: null
// //     }, {
// //         type: "Normal",
// //         name: "y",
// //         // TODO: should not be creating type ref here
// //         argType: { type: "TypeRef", typeRef: rawType },
// //         modifier: null
// //     }],
// //     rawType,
// //     { type: "Infix", operator: " " },
// //     null)

// // const joinWithSpaceParent = buildRootSymbol(Symbol("joinWithSpaceParent"), null, new FunctionSignatureContainer([joinWithSpace]))

// // function rawFunctionSigArg(name: string): FunctionArg {
// //     return {
// //         type: "Normal",
// //         name,
// //         argType: {
// //             type: "TypeRef",
// //             // TODO: should not be creating type ref here
// //             typeRef: { isCollection: false, namespace: "", name: "any" }
// //         },
// //         modifier: null
// //     }
// // }

// function applyOrderByArgs(tools: ApplyRewriteTools, expr: UntypedCall): ReaderWriter<MappingUtils, UntypedCall, [AtParam, ODataTypeRef][]> {

//     throw new Error("Maybe simplify with a string builder arg")
//     // return ReaderWriter.traverse(expr.args
//     //     .map<ReaderWriter<ExpressionMappingUtils, CallExpressionArg, [AtParam, ODataTypeRef][]>>(x => {

//     //         if (!isRewriteArg(x.sig, "OrderBy")) {
//     //             return ReaderWriter.retn(x, [])
//     //         }

//     //         const rawSignatureArg = rawFunctionSigArg(x.sig.name)
//     //         if (x.expr[expressionType] !== "Const"
//     //             || !Array.isArray(x.expr.value)
//     //             || x.expr.value.length !== 2) {
//     //             return ReaderWriter.retn({ ...x, sig: rawSignatureArg }, [])
//     //         }

//     //         let [prop, direction] = x.expr.value
//     //         return asExpression(null, prop)
//     //             .bind(prop => asExpression(null, direction)
//     //                 .bind(direction => direction
//     //                     ? tools.expressionTools.changeReturnType(direction, rawType)
//     //                     : ReaderWriter.retn(direction, []))
//     //                 .map(direction => [prop, direction]))
//     //             .bind(args => tools.expressionTools
//     //                 .buildCall(
//     //                     buildUntypedCall(joinWithSpaceParent, removeNulls(args), joinWithSpace, {})))
//     //             .map(expr => ({
//     //                 expr,
//     //                 sig: rawSignatureArg
//     //             }))
//     //     }), [])
//     //     .mapEnv((utils: MappingUtils) => ({ utils, queryType: tools.queryType }))
//     //     .map(args => {
//     //         const signature = buildSignature(
//     //             expr.signature.name,
//     //             args.map(({ sig }) => sig),
//     //             rawType,
//     //             expr.signature.callDetails,
//     //             expr.signature)

//     //         return buildUntypedCall(
//     //             expr.this,
//     //             args.map(({ expr }) => expr),
//     //             signature,
//     //             {})
//     //     })
// }

// function expandCountRewrittenSig(generic: ODataTypeRef): FunctionArg {
//     return {
//         type: "Normal",
//         name: "obj",
//         argType: { type: "TypeRef", typeRef: generic },
//         modifier: null
//     }
// }

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

export type ApplyRewriteTools = {
    expressionTools: ExpressionTools
    queryType: ODataTypeRef
}

export type ApplyRewriteArgTools = {
    tools: ApplyRewriteTools
    mappingUtils: MappingUtils
}

export type RewriteArg<TProcessPacket> = {
    type: string,
    canProcess: (sig: RewriteFunctionArg, expr: Expression, call: UntypedCall, index: number) => TProcessPacket | null
    isArg: (arg: Expression) => boolean
    process: (expr: UntypedCall, index: number, input: TProcessPacket) => ReaderWriter<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]>
}

export type ReWriteResult =
    | { type: "RewrittenCall", call: UntypedCall }
    | { type: "ReplacedCall", expr: Expression }

function buildReWriter<T>(rewriter: RewriteArg<T>) {
    return {
        type: rewriter.type,

        reWrite: (expr: UntypedCall, index: number, arg: RewriteFunctionArg) => {
            if (arg.descriptor.type !== rewriter.type) return null

            const processorPacket = rewriter.canProcess(arg, expr.args[index].expr, expr, index)
            return processorPacket && rewriter.process(expr, index, processorPacket)
        },
        canProcess: (sig: FunctionArg, expr: Expression) => {
            return sig.type === "Rewrite"
                && sig.descriptor.type === rewriter.type
                && rewriter.isArg(expr)
        }
    }
}

const rewriters = [
    buildReWriter(customQuery),
    buildReWriter(expandAnd),
    buildReWriter(expandCount),
    buildReWriter(filterRawExecutor),
    buildReWriter(filterRawProps),
    buildReWriter(logicalCollectionOp),
    buildReWriter(mapper),
    buildReWriter(orderBy),
    buildReWriter(outputType)
]

export function rewriteSignatureMatches(sig: FunctionArg, expr: Expression) {
    return !!rewriters.find(x => x.canProcess(sig, expr))
}

export function applyRewriteArgs(expr: UntypedCall): ReaderWriter<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]> {

    const [first] = removeNulls(expr.args.map((x, i) => x.sig.type === "Rewrite" ? [i, x.sig] as [number, RewriteFunctionArg] : null))
    if (!first) return ReaderWriter.retn({ type: "RewrittenCall", call: expr }, [])

    const initialState = null as null | ReaderWriter<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]>
    const result = rewriters
        .reduce((s, x) => s || x.reWrite(expr, first[0], first[1]), initialState)

    if (!result)
        throw new Error(`Invalid rewrite arg type ${(first[1].descriptor as any).type}`)

    return result
        .bind(result => result.type === "ReplacedCall"
            ? ReaderWriter.retn<ApplyRewriteArgTools, ReWriteResult, [AtParam, ODataTypeRef][]>(result, [])
            : applyRewriteArgs(result.call))
}