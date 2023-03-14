import { ODataTypeRef } from "magic-odata-shared";
import { expressionType } from "./expressionType.js";

export type ConstExpression = { [expressionType]: "Const", value: any, returnType: ODataTypeRef | null }

export function buildConst(value: any, returnType: ODataTypeRef | null): ConstExpression {

    return {
        [expressionType]: "Const",
        value,
        returnType
    }
}