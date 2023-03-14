import { Dict, ODataSchema, ODataTypeRef } from "magic-odata-shared";
import { Reader, ReaderWriter } from "../../utils.js";
import { AtParam } from "../../valueSerializer.js";
import { filterUtils, querySymbolDict, querySymbolNames, querySymbols } from "../inbuiltFunctions/functions.js";
import { dir, entity, entityName, expectPropertyOrErrorMsg, MappingUtils } from "../uriBuilder/utils.js";
import { buildRecorder, isRecorded, isRecorder, recorded, Recorded, recordedType, Recorder, root, rootName } from "../uriEvents/eventBuilder.js";
import { buildCall, CallExpression, changeCallReturnType, removeFunctionArgs } from "./callExpression.js";
import { resolveCallExpression } from "./callExpressionResolver.js";
import { buildConst, ConstExpression } from "./constExpression.js";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";
import { buildReContexted, ReContextedExpression } from "./reContextedExpression.js";
import { buildProp, PropExpression } from "./propExpression.js";
import { buildRootSymbol, RootSymbolExpression } from "./rootSymbolExpression.js";
import { buildStringBuilder, StringBuilderExpression } from "./stringBuilderExpression.js";
import { UntypedCall } from "./untypedCall.js";
import { filterUtilsNamespace, genericTypeNamespace, isGeneric } from "./utils.js";
import { buildNamedQuery, NamedQueryExpression } from "./namedQueryExpression.js";

export type Expression =
    | ConstExpression
    | PropExpression
    | RootSymbolExpression
    | CallExpression
    | StringBuilderExpression
    | ReContextedExpression
    | NamedQueryExpression

type Matches<T, TEnv> = {

    const: (x: ConstExpression, env: TEnv) => T
    prop: (x: PropExpression, env: TEnv) => T
    root: (x: RootSymbolExpression, env: TEnv) => T
    call: (x: CallExpression, env: TEnv) => T
    stringBuilder: (x: StringBuilderExpression, env: TEnv) => T
    reContext: (x: ReContextedExpression, env: TEnv) => T
    namedQuery: (x: NamedQueryExpression, env: TEnv) => T
}

export function match<T, TEnv>(expression: Expression, env: TEnv, matches: Matches<T, TEnv>): T {
    if (expression[expressionType] === "RootSymbol") {
        return matches.root(expression, env)
    }

    if (expression[expressionType] === "Const") {
        return matches.const(expression, env)
    }

    if (expression[expressionType] === "Prop") {
        return matches.prop(expression, env)
    }

    if (expression[expressionType] === "StringBuilder") {
        return matches.stringBuilder(expression, env)
    }

    if (expression[expressionType] === "NamedQuery") {
        return matches.namedQuery(expression, env)
    }

    if (expression[expressionType] === "ReContexted") {
        return matches.reContext(expression, env)
    }

    return matches.call(expression, env)
}

function bind<T1, U>(f: (tools: ExpressionTools, x1: T1) => U): (x1: T1) => U;
function bind<T1, T2, U>(f: (tools: ExpressionTools, x1: T1, x2: T2) => U): (x1: T1, x2: T2) => U;
function bind<T1, T2, T3, U>(f: (tools: ExpressionTools, x1: T1, x2: T2, x3: T3) => U): (x1: T1, x2: T2, x3: T3) => U;
function bind<T1, T2, T3, T4, U>(f: (tools: ExpressionTools, x1: T1, x2: T2, x3: T3, x4: T4) => U): (x1: T1, x2: T2, x3: T3, x4: T4) => U;
function bind<T1, T2, T3, T4, T5, U>(f: (tools: ExpressionTools, x1: T1, x2: T2, x3: T3, x4: T4, x5: T5) => U): (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5) => U;
function bind<T1, T2, T3, T4, T5, T6, U>(f: (tools: ExpressionTools, x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6) => U): (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6) => U;
function bind<T1, T2, T3, T4, T5, T6, T7, U>(f: (tools: ExpressionTools, x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6, x7: T7) => U): (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6, x7: T7) => U;
function bind(f: Function) {
    return function () { return f.call(null, expressionTools, ...arguments) }
}

export type ExpressionTools = {
    findParent(expr: Expression): Expression | null
    findRoot(expr: Expression): RootSymbolExpression | null
    match<T, TEnv>(expression: Expression, env: TEnv, matches: Matches<T, TEnv>): T
    changeReturnType(expr: Expression, returnType: ODataTypeRef): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]>,
    isGeneric(t: ODataTypeRef): boolean
    buildNamedQuery(thisArg: RootSymbolExpression, expr: Expression): NamedQueryExpression
    buildCall(untypedData: UntypedCall): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]>
    buildConst(value: any, returnType: ODataTypeRef | null): ConstExpression
    buildStringBuilder(thisArg: Expression | null, value: (Expression | string)[], returnType: ODataTypeRef): StringBuilderExpression
    buildProp(thisArg: Expression | null, name: string, returnType: ODataTypeRef | FunctionSignatureContainer): PropExpression
    removeFunctionArgs(expr: CallExpression, ...indexes: number[]): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]>
    asExpression(parent: Expression | null, input: Recorder | Recorded[]): ReaderWriter<ExpressionMappingUtils, Expression | null, [AtParam, ODataTypeRef][]>
    buildReContexted(expr: Expression, context: string): ReContextedExpression
    genericTypeNamespace: string
    filterUtilsNamespace: string
}

export const expressionTools: ExpressionTools = {
    findParent,
    findRoot,
    match,
    changeReturnType,
    isGeneric,
    buildConst,
    buildStringBuilder,
    buildReContexted,
    buildProp,
    buildNamedQuery,
    buildCall: bind(buildCall),
    removeFunctionArgs: bind(removeFunctionArgs),
    asExpression,
    genericTypeNamespace: genericTypeNamespace,
    filterUtilsNamespace: filterUtilsNamespace
}

const matchChangeReturnType: Matches<ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]>, ODataTypeRef> = {
    root: (expr, returnType) => ReaderWriter.retn(buildRootSymbol(expr.name, expr.contextName, returnType), []),
    const: (expr, returnType) => ReaderWriter.retn(buildConst(expr.value, returnType), []),
    prop: (expr, returnType) => ReaderWriter.retn(buildProp(expr.this, expr.name, returnType), []),
    stringBuilder: (expr, returnType) => ReaderWriter.retn(buildStringBuilder(expr.this, expr.value, returnType), []),
    namedQuery: (expr, returnType) => changeReturnType(expr.expr, returnType)
        .map(inner => buildNamedQuery(expr.this, inner)),
    reContext: (expr, returnType) => changeReturnType(expr.expr, returnType)
        .map(inner => buildReContexted(inner, expr.context)),
    call: (expr, returnType) => changeCallReturnType(expressionTools, expr, returnType)
}

function changeReturnType(expr: Expression, returnType: ODataTypeRef): ReaderWriter<ExpressionMappingUtils, Expression, [AtParam, ODataTypeRef][]> {
    return match(expr, returnType, matchChangeReturnType)
}

function findRoot(expr: Expression): RootSymbolExpression | null {
    return _findRoot(expr)
}

function _findRoot(expr: Expression | null): RootSymbolExpression | null {
    return !expr
        ? null
        : expr[expressionType] === "RootSymbol"
            ? expr
            : _findRoot(findParent(expr))
}

const matchFindParent: Matches<Expression | null, null> = {
    root: expr => null,
    const: expr => null,
    prop: expr => expr.this,
    stringBuilder: expr => expr.this,
    namedQuery: expr => expr.this,
    reContext: expr => findParent(expr.expr),
    call: expr => expr.data.this
}

function findParent(expr: Expression): Expression | null {
    return match(expr, null, matchFindParent)
}

export type ExpressionMappingUtils = {
    utils: MappingUtils
    queryType: ODataTypeRef
}

function getRootType(root: symbol): Reader<ExpressionMappingUtils, ODataTypeRef | FunctionSignatureContainer> {

    return Reader
        .create<ExpressionMappingUtils, ODataTypeRef | FunctionSignatureContainer>(env => {

            if (root === entity) return env.queryType

            const asFn = filterUtils[root]
            if (asFn?.type === "fn")
                return new FunctionSignatureContainer(asFn.value)

            if (querySymbolNames[root]) {
                return {
                    isCollection: false,
                    namespace: filterUtilsNamespace,
                    name: querySymbolNames[root]
                }
            }

            throw new Error(`Unknown symbol found: ${String(root)}`);
        })
}

function expectPropertyOrSignature(schemas: Dict<ODataSchema>, type: ODataTypeRef, property: string): ODataTypeRef | FunctionSignatureContainer {

    const propResult = expectPropertyOrErrorMsg(schemas, type, property)
    if (typeof propResult !== "string") return propResult

    if (type.isCollection) {
        throw new Error(propResult)
    }

    if (type.namespace !== filterUtilsNamespace) {
        throw new Error(propResult)
    }

    const utils = querySymbolDict[type.name]
    if (!utils) {
        throw new Error(`Could not find query utils ${type.name}`)
    }

    const fnMember = filterUtils[utils]
    const fn = (fnMember?.type === "ns" && fnMember.value[property]) || null
    if (!fn || fn.type !== "fn") {
        throw new Error(`Could not find query util function ${type.name}.${property}`)
    }

    return new FunctionSignatureContainer(fn.value)
}

export function asExpression(parent: Expression | null, input: Recorder | Recorded[]): ReaderWriter<ExpressionMappingUtils, Expression | null, [AtParam, ODataTypeRef][]> {

    if (input == null) {
        return ReaderWriter.retn(buildConst(null, null), [])
    }

    // TODO: remove all of thiese input[expressionType] checks and add a single isExpression method
    if (typeof (input as any)[expressionType] === "string") {
        return ReaderWriter.retn(input as any as Expression, [])
    }

    if (isRecorder(input)) {
        return getRootType(input[root])
            .map(returnType => buildRootSymbol(input[root], input[rootName] || null, returnType))
            .asReaderWriter<[AtParam, ODataTypeRef][]>([])
            .bind(x => asExpression(x, input[recorded]))
    }

    if (isRecorded(input)) {

        if (!input.length) {
            return ReaderWriter.retn(parent, [])
        }

        const [head, ...tail] = input
        if (head[recordedType] === "Get") {

            const returnType = parent?.returnType
            if (!returnType) {
                throw new Error(`Unable to find property ${head.data} of unknown type`);
            }

            if (returnType instanceof FunctionSignatureContainer) {
                throw new Error(`Unable to find property ${head.data} of function signature`);
            }

            return Reader
                .create<ExpressionMappingUtils, Expression>(env =>
                    buildProp(parent, head.data, expectPropertyOrSignature(env.utils.rootConfig.schemaNamespaces, returnType, head.data)))
                .asReaderWriter<[AtParam, ODataTypeRef][]>([])
                .bind(x => asExpression(x, tail).map(y => y || x))
        }

        if (head[recordedType] === "Apply") {

            const signature = parent?.returnType
            if (!(signature instanceof FunctionSignatureContainer)) {
                const fn = signature ? ` Found type "${entityName(signature)}" instead` : ""
                throw new Error(`Error finding signature for function call.${fn}`);
            }

            return ReaderWriter
                .traverse(
                    head.data.argArray.map(asExpression.bind(null, null)), [])

                .bind(args => {
                    if (args.filter(x => !!x).length !== args.length) {
                        throw new Error(`Error generating args for function call\n${signature.describe(true)}`);
                    }

                    return resolveCallExpression(expressionTools, {
                        signature: signature,
                        this: parent,
                        args: args as Expression[]
                    })
                })
        }
    }

    return ReaderWriter.retn(
        buildConst(input, null), [])
}