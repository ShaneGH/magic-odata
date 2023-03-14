import { Dict, ODataSchema, ODataTypeRef } from "magic-odata-shared"
import { ReaderWriter, zip } from "../../utils.js"
import { AtParam } from "../../valueSerializer.js"
import { isAssignableTo } from "../typeResolver.js"
import { dir } from "../uriBuilder/utils.js"
import { buildCall } from "./callExpression.js"
import { ExpressionTools, Expression, ExpressionMappingUtils } from "./expressions.js"
import { FunctionSignatureContainer } from "./functionSignatureContainer.js"
import { FunctionArg, FunctionSignature, expandSumTypeArgs, SignatureParamType, removeArgModifiers, GenericTokenMap, describeSignature } from "./functionSignatures.js"
import { buildUntypedCall } from "./untypedCall.js"
import { genericTypeNamespace } from "./utils.js"

function _extractGenericMap(signatureArg: ODataTypeRef, inputArg: ODataTypeRef): [string, ODataTypeRef][] {

    if (signatureArg.isCollection) {
        return inputArg.isCollection
            ? _extractGenericMap(signatureArg.collectionType, inputArg.collectionType)
            : []
    }

    return signatureArg.namespace === genericTypeNamespace
        ? [[signatureArg.name, inputArg]]
        : []
}

function extractGenericMap(signatureArg: SignatureParamType, inputArg: ODataTypeRef): [string, ODataTypeRef][] {

    if (signatureArg.type === "Sum") {
        // sum types should be removed from signature args earlier in the process
        throw new Error("An unexpected error has occurred")
    }

    return _extractGenericMap(signatureArg.typeRef, inputArg)
}

function typesAreAssignable(from: ODataTypeRef, to: ODataTypeRef, schemas: Dict<ODataSchema>): boolean {
    if (from.isCollection) {
        return to.isCollection && typesAreAssignable(from.collectionType, to.collectionType, schemas)
    }

    if (to.isCollection) return false
    return isAssignableTo([from], [to], schemas)
}

function buildGenericMap(signatureArgs: FunctionArg[], inputArgs: Expression[]): ReaderWriter<ExpressionMappingUtils, GenericTokenMap | null, [AtParam, ODataTypeRef][]> {

    return ReaderWriter.create(env =>
        [zip(signatureArgs, inputArgs)
            .reduce((s, [arg, input]) => {
                const ns = env.utils.rootConfig.schemaNamespaces

                if (!s) return null
                if (!input?.returnType) return s
                if (input.returnType instanceof FunctionSignatureContainer) return s

                const extractedTypes = arg?.type === "Rewrite" && arg.hasSimpleType
                    ? _extractGenericMap(arg.hasSimpleType, input.returnType)
                    : arg?.type === "Normal"
                        ? extractGenericMap(arg.argType, input.returnType)
                        : []

                return extractedTypes
                    .reduce((s, [token, type]) => {
                        if (!s) return null

                        if (!s[token] || typesAreAssignable(s[token], type, ns)) {
                            return {
                                ...s,
                                [token]: type
                            }
                        }

                        // Type map already exists and is exact
                        // bail out if the types do not match
                        return typesAreAssignable(type, s[token], ns)
                            ? s
                            : null
                    }, s as GenericTokenMap | null);
            }, {} as GenericTokenMap | null), []])
}

function _resolveCallExpression(tools: ExpressionTools, signature: FunctionSignature, expr: PartialCallExpression): ReaderWriter<ExpressionMappingUtils, Expression | string, [AtParam, ODataTypeRef][]> {

    const simplifiedSignature = removeArgModifiers(signature, expr.args.length)
    if (!simplifiedSignature) return ReaderWriter.retn(`Arg length mismatch: ${describeSignature(signature, false)}`, [])
    signature = simplifiedSignature

    return buildGenericMap(signature.inputArgs, expr.args)
        .bind<Expression | string>(generics => {
            if (!generics) return ReaderWriter.retn(`Generic arg mismatch: ${describeSignature(signature, false)}`, [])

            const structure = buildUntypedCall(expr.this, expr.args, signature, generics)
            return buildCall(tools, structure)
        })
}

export type PartialCallExpression = { this: Expression | null, args: Expression[], signature: FunctionSignatureContainer }
export function resolveCallExpression(tools: ExpressionTools, expr: PartialCallExpression): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {

    return expr.signature.signatures
        .reduce((s, x) => [...s, ...expandSumTypeArgs(x, 0)], [] as FunctionSignature[])
        .reduce((s, x) => s
            .bind(s => !Array.isArray(s)
                ? ReaderWriter.retn(s, [])
                : _resolveCallExpression(tools, x, expr)
                    .catchError(e => typeof e.message === "string" ? e.message as string : "Unexpected error", [])
                    .map(c => typeof c === "string" ? [...s, c] : c)
            ), ReaderWriter.retn([] as string[], []) as ReaderWriter<ExpressionMappingUtils, Expression | string[], [AtParam, ODataTypeRef][]>)
        .map(x => {
            if (Array.isArray(x)) {
                const err = `Unable match function signature\n${expr.signature.describe(true).map(x => ` * ${x}`).join("\n")}`
                throw new Error(x.length ? [err, "", "Attempted resolutions:"].concat(x).join("\n") : err);
            }

            return x
        })
}