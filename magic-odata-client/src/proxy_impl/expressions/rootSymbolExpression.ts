import { ODataTypeRef } from "magic-odata-shared";
import { expressionType } from "./expressionType.js";
import { FunctionSignatureContainer } from "./functionSignatureContainer.js";

export type RootSymbolExpression = {
    [expressionType]: "RootSymbol",
    name: symbol,
    contextName: string | null,
    returnType: ODataTypeRef | FunctionSignatureContainer
}

export function buildRootSymbol(name: symbol, contextName: string | null, returnType: ODataTypeRef | FunctionSignatureContainer): RootSymbolExpression {
    return {
        [expressionType]: "RootSymbol",
        name,
        contextName,
        returnType
    }
}