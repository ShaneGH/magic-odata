import { ODataSchema, ODataServiceConfig } from "magic-odata-shared";
import { IEntitySet, Params } from "../entitySetInterfaces.js";
import { OutputTypes, resolveOutputType } from "../query/filtering/queryPrimitiveTypes0.js";
import { buildUriBuilderRoot } from "../query/root.js";
import { AtParam, ParameterDefinition, rawType } from "../valueSerializer.js";

function ensureAt(param: string) {
    return param[0] === "@" ? param : `@${param}`
}

/**
 * @returns the first value in the tuple is mutable. Items will be added to it when methods on the second
 * value are called
 * The alternative is to use a Writer monad and expose this to the client, which is not ideal
 */
export function params<TRoot>(uriRoot: string, serviceConfig: ODataServiceConfig, schema: ODataSchema): [ParameterDefinition[], Params<TRoot>] {
    const ps: ParameterDefinition[] = [];
    let root: TRoot | null = null

    return [ps, {
        createRef<T>(paramName: string, ref: (root: TRoot) => IEntitySet<any, T, any, any, any, any, any, any>) {
            root ??= (buildUriBuilderRoot(uriRoot, serviceConfig, schema) as TRoot)

            paramName = ensureAt(paramName)
            const param: ParameterDefinition = { type: "Ref", data: { name: paramName, uri: ref(root) } }
            ps.push(param)
            return new AtParam(param) as any
        },

        createConst<T>(paramName: string, value: T, paramType?: OutputTypes | undefined) {

            paramName = ensureAt(paramName)
            const param: ParameterDefinition = { type: "Const", data: { name: paramName, value, paramType: paramType && resolveOutputType(paramType) } }
            ps.push(param)
            return new AtParam(param) as any
        },

        param(paramName: string) {

            paramName = ensureAt(paramName)
            const param: ParameterDefinition = { type: "Param", data: { name: paramName } }
            ps.push(param)
            return new AtParam(param) as any
        },

        createRawConst(paramName: string, value: string) {

            paramName = ensureAt(paramName)
            const param: ParameterDefinition = { type: "Const", data: { name: paramName, value, paramType: rawType } }
            ps.push(param)
            return new AtParam(param) as any
        }
    }]
}