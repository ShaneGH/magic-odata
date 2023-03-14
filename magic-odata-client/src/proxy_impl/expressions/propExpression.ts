import { ODataTypeRef } from "magic-odata-shared";
import { Expression } from "./expressions.js";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";

export type PropExpression = { [expressionType]: "Prop", this: Expression | null, name: string, returnType: ODataTypeRef | FunctionSignatureContainer }

export function buildProp(thisArg: Expression | null, name: string, returnType: ODataTypeRef | FunctionSignatureContainer): PropExpression {
    return {
        [expressionType]: "Prop",
        this: thisArg,
        name,
        returnType
    }
}