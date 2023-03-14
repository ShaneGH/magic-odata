import { ODataTypeRef } from "magic-odata-shared";
import { Expression } from "./expressions.js";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";

export type ReContextedExpression = {
    [expressionType]: "ReContexted",
    expr: Expression
    context: string
    returnType: ODataTypeRef | FunctionSignatureContainer | null
}

export function buildReContexted(expr: Expression, context: string): ReContextedExpression {
    return {
        [expressionType]: "ReContexted",
        expr,
        context,
        returnType: expr.returnType
    }
}