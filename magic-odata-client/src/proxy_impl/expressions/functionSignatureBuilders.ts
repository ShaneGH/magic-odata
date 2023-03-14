import { ODataCollectionTypeRef, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared"
import { OutputTypes } from "../../query/filtering/queryPrimitiveTypes0.js"
import { ArgModifier, buildSignature, FunctionArg, FunctionNamespaceFunction, FunctionNamespaceMember, FunctionType, NormalFunctionArg, SignatureParamType } from "./functionSignatures.js"
import { genericTypeNamespace } from "./utils.js"

type GenericArgOptions = Partial<{
    /** Default false */
    optional: boolean
}>

type MapperArgOptions = Partial<{
    /** Default true */
    optional: boolean
}>

export const args = {
    primitive(name: string, type: "number" | "string", options?: GenericArgOptions): FunctionArg {
        return { type: "Normal", name, argType: types.t({ isCollection: false, namespace: "", name: type }), modifier: options?.optional ? ArgModifier.Optional : null }
    },

    gen(name: string, token: string, options?: GenericArgOptions, collection = false): FunctionArg {
        return { type: "Normal", name, argType: types.gen(token, collection), modifier: options?.optional ? ArgModifier.Optional : null }
    },

    gens(name: string, token: string, options?: GenericArgOptions): FunctionArg {
        return { type: "Normal", name, argType: types.gens(token), modifier: options?.optional ? ArgModifier.Optional : null }
    },

    sum(name: string, t1: ODataTypeRef, t2: ODataTypeRef, ...ts: ODataTypeRef[]): NormalFunctionArg {
        return { type: "Normal", name, argType: types.sum(t1, t2, ...ts), modifier: null }
    },

    sumSpread(name: string, t1: ODataTypeRef, t2: ODataTypeRef, ...ts: ODataTypeRef[]): FunctionArg {
        return {
            ...args.sum(name, t1, t2, ...ts),
            modifier: ArgModifier.Spread
        }
    },

    type(name: string, typeRef: ODataTypeRef, options?: GenericArgOptions): FunctionArg {
        return { type: "Normal", name, argType: { type: "TypeRef", typeRef }, modifier: options?.optional ? ArgModifier.Optional : null }
    },

    /**
     * @param type Should not be a collection. Collection will be added
     */
    spread(name: string, type: ODataTypeRef): FunctionArg {
        const argType: SignatureParamType = {
            type: "TypeRef",
            typeRef: {
                isCollection: true,
                collectionType: type
            }
        }

        return { type: "Normal", name, argType, modifier: ArgModifier.Spread }
    },

    mapper(name: string, forType: SignatureParamType, options?: MapperArgOptions): FunctionArg {
        return {
            type: "Rewrite",
            name,
            modifier: options?.optional || options?.optional == null ? ArgModifier.Optional : null,
            descriptor: { type: "Mapper", forType },
            hasSimpleType: null
        }
    },

    logicalCollectionOp(forType: ODataTypeRef): FunctionArg {
        return {
            type: "Rewrite",
            name: "collectionItemOperation",
            modifier: null,
            descriptor: {
                type: "LogicalCollectionOp",
                forType
            },
            hasSimpleType: null
        }
    },

    outputType(type?: "OutputTypes" | "RealNumberTypes"): FunctionArg {
        return {
            type: "Rewrite",
            name: "outputType",
            descriptor: { type: "OutputType", outputEnum: type || "OutputTypes" },
            modifier: ArgModifier.Optional,
            hasSimpleType: null
        }
    },

    orderBy(): FunctionArg {
        return {
            type: "Rewrite",
            name: "properties",
            descriptor: { type: "OrderBy" },
            modifier: ArgModifier.Spread,
            hasSimpleType: null
        }
    },

    filterRawProps(): FunctionArg {
        return {
            type: "Rewrite",
            name: "obj",
            descriptor: { type: "FilterRawProps" },
            modifier: null,
            hasSimpleType: null
        }
    },

    filterRawExecutor(): FunctionArg {
        return {
            type: "Rewrite",
            name: "filter",
            descriptor: { type: "FilterRawExecutor" },
            modifier: null,
            hasSimpleType: null
        }
    },

    customQueryArg(): FunctionArg {
        return {
            type: "Rewrite",
            name: "paramName",
            descriptor: { type: "CustomQueryArg" },
            modifier: null,
            hasSimpleType: null
        }
    },

    expandAnd(): FunctionArg {
        return {
            type: "Rewrite",
            name: "and",
            descriptor: { type: "ExpandAnd" },
            modifier: ArgModifier.Optional,
            hasSimpleType: null
        }
    },

    expandCount(): FunctionArg {
        return {
            type: "Rewrite",
            name: "obj",
            descriptor: { type: "ExpandCount" },
            modifier: ArgModifier.Optional,
            hasSimpleType: types.genT("T")
        }
    }
}

export const types = {
    collection(collectionType: ODataTypeRef): ODataTypeRef {
        return { isCollection: true, collectionType }
    },
    primitiveT(name: "number" | "string"): ODataSingleTypeRef {
        return { isCollection: false, namespace: "", name }
    },
    primitive(name: "number" | "string"): SignatureParamType {
        return { type: "TypeRef", typeRef: types.primitiveT(name) }
    },
    t(typeRef: ODataTypeRef): SignatureParamType {
        return { type: "TypeRef", typeRef }
    },
    sum(t1: ODataTypeRef, t2: ODataTypeRef, ...ts: ODataTypeRef[]): SignatureParamType {
        return { type: "Sum", typeRefs: [t1, t2, ...ts] }
    },
    gen(token: string, collection = false): SignatureParamType {
        return { type: "TypeRef", typeRef: types.genT(token, collection) }
    },
    genT(token: string, collection = false): ODataTypeRef {
        if (collection) {
            return {
                isCollection: true,
                collectionType: types.genT(token)
            }
        }

        return { isCollection: false, namespace: genericTypeNamespace, name: token }
    },
    gens(token: string): SignatureParamType {
        return { type: "TypeRef", typeRef: types.gensT(token) }
    },
    gensT(token: string): ODataCollectionTypeRef {
        return { isCollection: true, collectionType: { isCollection: false, namespace: genericTypeNamespace, name: token } }
    }
}

export type ExtractedArgs<T> = {
    mapper: ((x: any) => string) | null
    outputType: OutputTypes | null
    remainder: [T, NormalFunctionArg][]
}

function fn(name: string, signature: [FunctionArg[], ODataTypeRef][], callDetails: FunctionType): FunctionNamespaceFunction {
    return {
        type: "fn",
        value: signature
            .map(([inputArgs, outputType]) =>
                buildSignature(name, inputArgs, outputType, callDetails, null))
    }
}

export function infixFn(name: string, inputArgs: FunctionArg[], outputType: ODataTypeRef, renameOperator?: string): FunctionNamespaceFunction {
    return infixFns(name, [[inputArgs, outputType]], renameOperator)
}

export function infixFns(name: string, signature: [FunctionArg[], ODataTypeRef][], renameOperator?: string): FunctionNamespaceFunction {
    return fn(name, signature, { type: "Infix", operator: renameOperator || ` ${name} ` })
}

export function functionCall(name: string, inputArgs: FunctionArg[], outputType: ODataTypeRef, renameFunction?: string): FunctionNamespaceFunction {
    return functionCalls(name, [[inputArgs, outputType]], renameFunction)
}

export function functionCalls(name: string, signature: [FunctionArg[], ODataTypeRef][], renameFunction?: string): FunctionNamespaceFunction {
    return fn(name, signature, { type: "FunctionCall", name: renameFunction || name })
}

export function returnInputsCall(name: string, inputArgs: FunctionArg[], outputType: ODataTypeRef, separator: string): FunctionNamespaceFunction {
    return infixFns(name, [[inputArgs, outputType]], separator)
}

export function returnInputsCalls(name: string, signature: [FunctionArg[], ODataTypeRef][], separator: string): FunctionNamespaceFunction {
    return fn(name, signature, { type: "Infix", operator: separator })
}