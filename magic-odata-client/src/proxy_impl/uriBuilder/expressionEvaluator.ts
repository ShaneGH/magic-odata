import { ODataTypeRef } from "magic-odata-shared";
import { ReaderWriter } from "../../utils.js";
import { AtParam, serialize } from "../../valueSerializer.js";
import { Expression, match } from "../expressions/expressions.js";
import { expressionType } from "../expressions/expressionType.js";
import { getSignatureErrorMessages } from "../expressions/functionSignatures.js";
import { RootSymbolExpression } from "../expressions/rootSymbolExpression.js";
import { isRecorder } from "../uriEvents/eventBuilder.js";
import { dirFn, MappingUtils } from "./utils.js";

function validateConst(value: any) {

    if (!value) return

    if (isRecorder(value) || typeof value[expressionType] === "string") {
        // TODO: better error message
        throw new Error("Invalid expression detected");
    }

    if (Array.isArray(value)) {
        value.forEach(validateConst)
    }

    if (typeof value === "object") {
        Object
            .keys(value)
            .forEach(x => validateConst(value[x]));
    }

    return value
}

export function evaluateExpression(expression: Expression) {
    return _evaluateExpression(expression, true)
}

type EvaluationResult = [RootSymbolExpression | null, string | null]

function _evaluateExpression(expression: Expression, topLevel: boolean)
    : ReaderWriter<MappingUtils, EvaluationResult, [AtParam, ODataTypeRef][]> {

    if (!expression || typeof expression[expressionType] !== "string") {
        throw new Error("Expression cannot be evaluated");
    }

    return match<ReaderWriter<MappingUtils, EvaluationResult, [AtParam, ODataTypeRef][]>, null>(expression, null, {
        root: expression => ReaderWriter.create(env => [[
            expression,
            topLevel || (expression.contextName != null && expression.contextName !== env.currentContext)
                ? expression.contextName
                : null
        ], []]),

        const: expression => ReaderWriter
            .create((env: MappingUtils) =>
                serialize(
                    validateConst(expression.value),
                    expression.returnType || undefined,
                    env.rootConfig.schemaNamespaces).execute())
            .map(x => [null, x]),

        call: expression => {
            if (!expression.data.this) {
                throw new Error("Unexpected call with no context");
            }

            const err = getSignatureErrorMessages(expression.data.signature)
            if (err.length) {
                throw new Error(["Error creating call expression"].concat(err).join("\n"))
            }

            return _evaluateExpression(expression.data.this, false)
                .bind(([category, _]) => ReaderWriter
                    .traverse(expression.data.args.map(({ expr }) => _evaluateExpression(expr, true)), [])
                    .map(args => [
                        category,
                        expression.data.signature.callDetails.type === "Infix"
                            ? args.map(([, x]) => x).join(expression.data.signature.callDetails.operator)
                            : `${expression.data.signature.callDetails.name}(${args.map(x => x[1]).join(",")})`
                    ]))
        },

        stringBuilder: expression => {

            const parts = expression.value
                .map(v => typeof v === "string"
                    ? ReaderWriter.retn<MappingUtils, EvaluationResult, [AtParam, ODataTypeRef][]>([null, v], [] as [AtParam, ODataTypeRef][])
                    : _evaluateExpression(v, true));

            return ReaderWriter
                .traverse(parts, [])
                .map(xs => [
                    xs.map(([x, _]) => x).find(x => !!x),
                    xs.map(([_, x]) => x).join("")
                ] as EvaluationResult)
        },

        reContext: expression => _evaluateExpression(expression.expr, topLevel)
            .mapEnv<MappingUtils>(env => ({ ...env, currentContext: expression.context })),

        namedQuery: expression => _evaluateExpression(expression.expr, topLevel)
            .map(([ctxt, result]) => [ctxt, result && expression.this.contextName && `${expression.this.contextName}=${result}`]),

        prop: expression => expression.this ?
            _evaluateExpression(expression.this, false)
                .map(([x, y]) => [x, y ? `${y}/${expression.name}` : expression.name])
            : ReaderWriter.retn([null, expression.name], [])
    })
}