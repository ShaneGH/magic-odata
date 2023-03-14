import { ODataTypeRef } from "magic-odata-shared";
import { Expression } from "./expressions.js";
import { expressionType } from "./expressionType.js";

export type StringBuilderExpression = {
    [expressionType]: "StringBuilder"
    value: (Expression | string)[]
    this: Expression | null
    returnType: ODataTypeRef
}

export function buildStringBuilder(thisArg: Expression | null, value: (Expression | string)[], returnType: ODataTypeRef): StringBuilderExpression {
    return {
        [expressionType]: "StringBuilder",
        this: thisArg,
        value,
        returnType
    }
}
