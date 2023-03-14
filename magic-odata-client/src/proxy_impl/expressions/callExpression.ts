import { ODataTypeRef } from "magic-odata-shared";
import { Reader, ReaderWriter } from "../../utils.js";
import { AtParam, rawType } from "../../valueSerializer.js";
import { isAssignableTo } from "../typeResolver.js";
import { entityName } from "../uriBuilder/utils.js";
import { applyRewriteArgs, ReWriteResult } from "./rewriteArgs/callExpressionRewriteArgs.js";
import { ExpressionTools, Expression, ExpressionMappingUtils } from "./expressions.js";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";
import { applyGenericTypeMap, FunctionArg, getSignatureErrorMessages } from "./functionSignatures.js";
import { buildUntypedCall, changeUntypedCallReturnType, insertUntypedFunctionArg, removeUntypedFunctionArgs, UntypedCall } from "./untypedCall.js";

export type CallExpression = { [expressionType]: "Call", data: UntypedCall, returnType: ODataTypeRef }


export function buildCallAfterRewrites(
    expressionTools: ExpressionTools,
    untyped: UntypedCall): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {

    const signature = applyGenericTypeMap(untyped.signature, untyped.genericTokens)
    const untypedData = buildUntypedCall(untyped.this, untyped.args.map(({ expr }) => expr), signature, untyped.genericTokens)

    const err = getSignatureErrorMessages(signature)
    if (err.length) {
        throw new Error(["Error creating call"].concat(err).join("\n"))
    }

    return Reader
        .create((env: ExpressionMappingUtils) => untypedData.args
            .reduce((acc, { expr, sig }) => {

                if (expr.returnType instanceof FunctionSignatureContainer) {
                    throw new Error(`Arg ${sig.name} does not have a concrete value`)
                }

                if (sig.type === "Rewrite") {
                    throw new Error(`Unexpected rewrite arg: ${sig.name}`)
                }

                if (sig.argType.type !== "TypeRef") {
                    // should not happen this should be caught in getSignatureErrorMessages
                    throw new Error("Unexpected error")
                }

                let changeReturnType = false
                if (expr.returnType) {
                    if (!expr.returnType.isCollection
                        && expr.returnType.namespace === rawType.namespace
                        && expr.returnType.name === rawType.name) {

                        changeReturnType = true
                    } else if (!isAssignableTo([expr.returnType], [sig.argType.typeRef], env.utils.rootConfig.schemaNamespaces)) {
                        throw new Error(`Function arg "${sig.name}" with type "${entityName(expr.returnType)}" does `
                            + `not match function signature type "${entityName(sig.argType.typeRef)}"`)
                    }
                } else {
                    changeReturnType = true
                }

                return {
                    done: [
                        ...acc.done,
                        changeReturnType
                            ? expressionTools.changeReturnType(expr, sig.argType.typeRef)
                            : ReaderWriter.retn(expr, [] as [AtParam, ODataTypeRef][])
                    ],
                    changed: acc.changed || changeReturnType
                }
            }, { done: [] as ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]>[], changed: false }))
        .asReaderWriter([] as [AtParam, ODataTypeRef][])
        .bind(({ done, changed }) => ReaderWriter
            .traverse(done, [])
            .map(as => ({ args: as, changed, untypedData })))
        .map(({ args, changed, untypedData }) => {

            untypedData = changed
                ? buildUntypedCall(untypedData.this, args, untypedData.signature, untypedData.genericTokens)
                : untypedData

            return {
                [expressionType]: "Call",
                returnType: untypedData.signature.outputType,
                data: untypedData
            }
        });
}

export function buildCall(
    expressionTools: ExpressionTools,
    untyped: UntypedCall): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {

    return ReaderWriter.bindCreate<ExpressionMappingUtils, ReWriteResult, [AtParam, ODataTypeRef][]>(env =>
        applyRewriteArgs(untyped)
            .mapEnv<ExpressionMappingUtils>(env => ({
                tools: { expressionTools, queryType: env.queryType },
                mappingUtils: env.utils
            })))
        .bind(result => result.type === "RewrittenCall"
            ? buildCallAfterRewrites(expressionTools, result.call)
            : ReaderWriter.retn(result.expr, []));
}

export function removeFunctionArgs(tools: ExpressionTools, expr: CallExpression, ...indexes: number[]): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {

    const str = removeUntypedFunctionArgs(expr.data, ...indexes)
    return buildCall(tools, str)
}

export function insertFunctionArg(tools: ExpressionTools, expr: CallExpression, index: number, expression: Expression, signature: FunctionArg): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {
    const str = insertUntypedFunctionArg(expr.data, index, expression, signature)
    return buildCall(tools, str)
}

export function changeCallReturnType(tools: ExpressionTools, expr: CallExpression, returnType: ODataTypeRef): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {

    const str = changeUntypedCallReturnType(expr.data, returnType)
    return buildCall(tools, str)
}
