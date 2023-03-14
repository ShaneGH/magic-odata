import { Dict, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared"
import { range, removeNulls } from "../../utils.js"
import { entityName } from "../uriBuilder/utils.js"
import { genericTypeNamespace as genericTypeNamespace, isGeneric } from "./utils.js"


export type FunctionNamespaceFunction = { type: "fn", value: FunctionSignature[] }

export type FunctionNamespaceMember =
    | { type: "ns", value: FunctionNamespace }
    | FunctionNamespaceFunction

export type FunctionNamespace = {
    [k: symbol | string]: FunctionNamespaceMember
}

export type SignatureParamType =
    | { type: "TypeRef", typeRef: ODataTypeRef }
    | { type: "Sum", typeRefs: ODataTypeRef[] }

export type RewriteFunctionArgType =
    | { type: "Mapper", forType: SignatureParamType }
    | { type: "OutputType", outputEnum: "OutputTypes" | "RealNumberTypes" }
    | { type: "LogicalCollectionOp", forType: ODataTypeRef }
    | { type: "FilterRawProps" }
    | { type: "FilterRawExecutor" }
    | { type: "CustomQueryArg" }
    | { type: "OrderBy" }
    | { type: "ExpandAnd" }
    | { type: "ExpandCount" }

export enum ArgModifier {
    Spread = "Spread",
    Optional = "Optional"
}

export type NormalFunctionArg = {
    type: "Normal",
    name: string,
    argType: SignatureParamType,
    modifier: ArgModifier | null
}

/** This arg will re-write the expression that contains it */
export type RewriteFunctionArg = {
    type: "Rewrite",
    name: string,
    descriptor: RewriteFunctionArgType,
    modifier: ArgModifier | null,
    hasSimpleType: ODataTypeRef | null
}

export type FunctionArg =
    | NormalFunctionArg
    | RewriteFunctionArg

export type FunctionType =
    | { type: "Infix", operator: string }
    | { type: "FunctionCall", name: string }

export enum SignatureErrorReason {
    Modifier = "Modifier",
    Rewrite = "Rewrite",
    Sum = "Sum",
    Generic = "Generic"
}

export type FunctionSignature = {
    name: string,
    /** [SignatureErrorReason, string][] is a list of args and reasons why they are not executable */
    executable: true | [SignatureErrorReason, string][]
    inputArgs: FunctionArg[],
    outputType: ODataTypeRef,
    callDetails: FunctionType,
    constructedFrom: FunctionSignature | null
}

function describeSignatureArgType(arg: SignatureParamType): string {
    return arg.type === "TypeRef"
        ? entityName(arg.typeRef)
        : arg.typeRefs.map(x => entityName(x, true)).join(" | ")
}

function describeSignatureArg(arg: FunctionArg) {
    return `${arg.name}: ${arg.type === "Rewrite" ? "any" : describeSignatureArgType(arg.argType)}`
}

export function describeSignature(sig: FunctionSignature, fromRoot: boolean): string {
    if (fromRoot && sig.constructedFrom)
        return describeSignature(sig.constructedFrom, fromRoot)

    return `${sig.name}(${sig.inputArgs.map(describeSignatureArg).join(", ")}): ${entityName(sig.outputType, true)}`
}

function unexpectedGenericError(sig: FunctionSignature, paramName: string | "FunctionOutput", t: ODataSingleTypeRef): string | null {

    // TODO: this is only an issue if this function output is the input to another
    // function. Otherwise "rawType" can be used
    // TODO: eyeball a test for this case
    if (paramName === "FunctionOutput") {
        const output = sig.inputArgs
            .filter(a => a.type === "Rewrite" && a.descriptor.type === "OutputType")[0]

        if (output) {
            return `Unable to resolve type information for function output. ` +
                `Use the "${output.name}" argument of the "${sig.name}" function to specify the output type`
        }
    } else {
        const mapper = sig.inputArgs
            .filter(a => a.type === "Rewrite" && a.descriptor.type === "Mapper")[0]

        if (mapper) {
            return `Unable to resolve type information for argument "${paramName}". ` +
                `Use the "${mapper.name}" argument of the "${sig.name}" function to skip type resolution by manually serializing values`
        }
    }

    return sig.constructedFrom && unexpectedGenericError(sig.constructedFrom, paramName, t)
}

function applyType(sig: FunctionSignature, genericTokens: GenericTokenMap, paramName: string | "FunctionOutput", t: ODataTypeRef): ODataTypeRef {
    if (t.isCollection) {
        return {
            isCollection: true,
            collectionType: applyType(sig, genericTokens, paramName, t.collectionType)
        }
    }

    if (t.namespace !== genericTypeNamespace) {
        return t
    }

    if (!genericTokens[t.name]) {
        let err = unexpectedGenericError(sig, paramName, t)
        err = `Unable to find concrete type for generic type: ${t.name}${(err && `\n${err}`) || ""}`
        throw new Error(err)
    }

    return genericTokens[t.name]
}

// Should be export type GenericTokenMap = Dict<ODataTypeRef[]>,
// in order to handle a definition like this: function<T, U>(x: T | U) { }. 
// If enabling this, test that this function can resolve both args correctly: (function<T, U>(x: T, y: T | U) { }(1, "1"))
export type GenericTokenMap = Dict<ODataTypeRef>

function applyParam(sig: FunctionSignature, genericTokens: GenericTokenMap, paramName: string, paramType: SignatureParamType): SignatureParamType {
    return paramType.type === "TypeRef"
        ? {
            ...paramType,
            typeRef: applyType(sig, genericTokens, paramName, paramType.typeRef)
        }
        : {
            ...paramType,
            typeRefs: paramType.typeRefs
                .map(applyType.bind(null, sig, genericTokens, paramName))
        }
}

function applyRewrite(sig: FunctionSignature, arg: RewriteFunctionArg, genericTokens: GenericTokenMap): RewriteFunctionArg {
    if (arg.descriptor.type !== "Mapper") return arg

    return {
        ...arg,
        descriptor: {
            ...arg.descriptor,
            forType: applyParam(sig, genericTokens, arg.name, arg.descriptor.forType)
        }
    }
}

export function applyGenericTypeMap(signature: FunctionSignature, genericTokens: GenericTokenMap) {

    const args = signature.inputArgs
        .map<FunctionArg>(x => x.type === "Rewrite"
            ? applyRewrite(signature, x, genericTokens)
            : {
                ...x,
                argType: applyParam(signature, genericTokens, x.name, x.argType)
            })

    const output = applyType(signature, genericTokens, "FunctionOutput", signature.outputType)
    return buildSignature(signature.name, args, output, signature.callDetails, signature)
}

export function getSignatureErrorMessages(signature: FunctionSignature) {
    if (signature.executable === true) return []

    return signature.executable.map(([reason, name]) => {
        if (reason === SignatureErrorReason.Generic) {
            return `Arg "${name}" is generic`
        }

        if (reason === SignatureErrorReason.Rewrite) {
            return `Arg "${name}" is not executable`
        }

        if (reason === SignatureErrorReason.Modifier) {
            return `Arg "${name}" has a modifier`
        }

        if (reason === SignatureErrorReason.Sum) {
            return `Arg "${name}" is not a single type`
        }

        return `Invalid arg ${name}`
    })
}

function toArray(t: SignatureParamType): ODataTypeRef[] {

    return Array.isArray(t)
        ? t
        : t.type === "Sum"
            ? t.typeRefs
            : [t.typeRef]
}

function unwrapFirstCollection(t: ODataTypeRef): ODataTypeRef {
    return t.isCollection ? t.collectionType : t
}

function mapperCanHandleArg(mapperType: SignatureParamType, argType: SignatureParamType): boolean {

    const mapperTypes = toArray(mapperType)
    const argTypes = toArray(argType).map(unwrapFirstCollection)

    if (mapperTypes.length === 0 || argTypes.length == 0) {
        throw new Error("Invalid type signature. Sum with no types");
    }

    const mapperTs = mapperTypes.map(x => entityName(x))
    return argTypes
        .map(x => entityName(x))
        .reduce((s, x) => s && mapperTs.indexOf(x) !== -1, true)
}

function validateMapperArg(signature: FunctionSignature, arg: FunctionArg, mapperType: SignatureParamType) {

    const invalidTs = signature.inputArgs
        .filter(a => a !== arg && a.type === "Normal" && !mapperCanHandleArg(mapperType, a.argType))
        .map(a => a.name)
        .join(", ")

    if (invalidTs) {
        throw new Error(`Mapper rewrite types require that all other args are of the same type (${invalidTs})`)
    }
}

function validateRewriteArgs(signature: FunctionSignature): FunctionSignature {

    removeNulls(signature.inputArgs.map(x =>
        x.type === "Rewrite" && x.descriptor.type === "Mapper"
            ? [x, x.descriptor.forType] as [FunctionArg, SignatureParamType]
            : null))
        .forEach(([arg, t]) => validateMapperArg(signature, arg, t))

    return signature
}

function genericsInType(x: SignatureParamType): number {
    return x.type === "TypeRef"
        ? isGeneric(x.typeRef) ? 1 : 0
        : x.typeRefs.reduce((s, x) => s + (isGeneric(x) ? 1 : 0), 0)
}

export function buildSignature(
    name: string,
    inputArgs: FunctionArg[],
    outputType: ODataTypeRef,
    callDetails: FunctionType,
    constructedFrom: FunctionSignature | null): FunctionSignature {

    const notExecutable = removeNulls(inputArgs
        .map<[SignatureErrorReason, string] | null>(x => {
            // if (x.type === "Normal" && genericsInType(x.argType) > 1) {

            //     // see comments on GenericTokenMap for details
            //     throw new Error("Sum types with multiple generics not supported");
            // }

            if (x.type !== "Normal") return [SignatureErrorReason.Rewrite, x.name]
            if (x.modifier !== null) return [SignatureErrorReason.Modifier, x.name]
            if (x.argType.type !== "TypeRef") return [SignatureErrorReason.Sum, x.name]
            if (isGeneric(x.argType.typeRef)) return [SignatureErrorReason.Generic, x.name]

            return null
        })
        .concat(isGeneric(outputType) ? [SignatureErrorReason.Generic, "Output"] : []))

    return validateRewriteArgs({
        name,
        executable: notExecutable.length ? notExecutable : true,
        inputArgs,
        outputType,
        callDetails,
        constructedFrom
    })
}

export function removeSignatureArgs(
    signature: FunctionSignature, ...argIndexes: number[]): FunctionSignature {

    for (let i = 0; i < argIndexes.length; i++) {
        if (signature.inputArgs.length <= argIndexes[i]) {
            throw new Error(`Arg index ${argIndexes[i]} out of range for function ${signature.name}`)
        }
    }

    const args = signature.inputArgs
        .filter((_, i) => argIndexes.indexOf(i) === -1)

    return buildSignature(signature.name, args, signature.outputType, signature.callDetails, signature)
}

export function insertSignatureArgs(signature: FunctionSignature, index: number, ...args: FunctionArg[]): FunctionSignature {
    if (index > signature.inputArgs.length) {
        throw new Error("Index out of range")
    }

    const as = [
        ...signature.inputArgs.slice(0, index),
        ...args,
        ...signature.inputArgs.slice(index)
    ]

    return buildSignature(signature.name, as, signature.outputType, signature.callDetails, signature)
}

export function changeSignatureReturnType(signature: FunctionSignature, outputType: ODataTypeRef): FunctionSignature {

    return buildSignature(signature.name, signature.inputArgs, outputType, signature.callDetails, signature)
}

export function tryGetArgFromSpread(arg: FunctionArg, i: number): FunctionArg | null {

    if (arg.type === "Rewrite") {
        return {
            ...arg,
            name: `${arg.name}[${i}]`,
            modifier: null
        }
    }

    if (arg.argType.type === "Sum" || !arg.argType.typeRef.isCollection) {
        return null
    }

    return {
        type: "Normal",
        name: `${arg.name}[${i}]`,
        argType: { type: "TypeRef", typeRef: arg.argType.typeRef.collectionType },
        modifier: null
    }
}
type ArgsMatchAcc = { inputs: FunctionArg[], outputs: FunctionArg[], spreadIndex: number, modified: boolean } | null

/** Given a function signature, remove or simplify args with modifiers (Spread, Optional) to match the call expression */
export function removeArgModifiers(signature: FunctionSignature, expectedArgs: number): FunctionSignature | null {

    const result: ArgsMatchAcc = range(expectedArgs)
        .reduce(s => {

            if (!s) return null
            if (!s.inputs.length) return null

            const [head, ...tail] = s.inputs
            if (head.modifier !== ArgModifier.Spread) {
                return {
                    inputs: tail,
                    modified: s.modified || head.modifier !== null,
                    spreadIndex: s.spreadIndex,
                    outputs: [
                        ...s.outputs,
                        head.modifier === null
                            ? head
                            : { ...head, modifier: null }
                    ]
                }
            }

            const spreadArg = tryGetArgFromSpread(head, s.spreadIndex)
            if (!spreadArg) {
                return null
            }

            return {
                inputs: s.inputs,
                modified: true,
                spreadIndex: s.spreadIndex + 1,
                outputs: [...s.outputs, spreadArg]
            }
        }, { inputs: signature.inputArgs, spreadIndex: 0, outputs: [], modified: false } as ArgsMatchAcc)

    if (!result) return null
    if (result.inputs.length && result.inputs[0].modifier === null) return null

    return result.modified || result.outputs.length !== signature.inputArgs.length
        ? buildSignature(signature.name, result.outputs, signature.outputType, signature.callDetails, signature)
        : signature
}

export function expandSumTypeArgs(signature: FunctionSignature, argI: number): FunctionSignature[] {
    if (argI >= signature.inputArgs.length) {
        return [signature]
    }

    const arg = signature.inputArgs[argI]
    if (arg.type !== "Normal" || arg.argType.type !== "Sum") {
        return expandSumTypeArgs(signature, argI + 1)
    }

    return arg.argType.typeRefs
        .map(typeRef => buildSignature(
            signature.name,
            [
                ...signature.inputArgs.slice(0, argI),
                {
                    type: "Normal",
                    name: arg.name,
                    argType: { type: "TypeRef", typeRef },
                    modifier: arg.modifier
                },
                ...signature.inputArgs.slice(argI + 1)
            ],
            signature.outputType,
            signature.callDetails,
            signature))
        .reduce((s, sig) => [
            ...s,
            ...expandSumTypeArgs(sig, argI + 1)
        ], [] as FunctionSignature[])
}