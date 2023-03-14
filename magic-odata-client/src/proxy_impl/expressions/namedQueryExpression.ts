import { ODataTypeRef } from "magic-odata-shared";
import { Expression } from "./expressions.js";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";
import { RootSymbolExpression } from "./rootSymbolExpression.js";

export type NamedQueryExpression = {
    [expressionType]: "NamedQuery",
    expr: Expression
    this: RootSymbolExpression
    returnType: ODataTypeRef | FunctionSignatureContainer | null
}

export function buildNamedQuery(thisArg: RootSymbolExpression, expr: Expression): NamedQueryExpression {
    return {
        [expressionType]: "NamedQuery",
        expr,
        this: thisArg,
        returnType: expr.returnType
    }
}