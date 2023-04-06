import { ODataSchema, ODataServiceConfig } from "magic-odata-shared";
import { IEntitySet, Param, Params, RefType } from "../entitySetInterfaces.js";
import { OutputTypes, resolveOutputType } from "../query/filtering/queryPrimitiveTypes0.js";
import { buildUriBuilderRoot } from "../query/root.js";
import { AtParam, SerializerSettings, rawType } from "../valueSerializer.js";

function ensureAt(param: string) {
    return param[0] === "@" ? param : `@${param}`
}

/**
 * @returns the first value in the tuple is mutable. Items will be added to it when methods on the second
 * value are called
 * The alternative is to use a Writer monad and expose this to the client, which is not ideal
 */
export function params<TRoot>(uriRoot: string, serviceConfig: ODataServiceConfig, serializerSettings: SerializerSettings, schema: ODataSchema): Params<TRoot> {
    let $root: TRoot | null = null
    let refObject: TRoot | null = null

    return {
        createRef<T>(paramName: string, ref: (root: TRoot) => IEntitySet<any, T, any, any, any, any, any, any>, refType?: RefType) {
            const serializeAsObject = refType !== RefType.$root

            let root: TRoot;
            if (serializeAsObject) {
                root = (refObject ??= buildUriBuilderRoot(
                    uriRoot, serializerSettings, serviceConfig, schema) as TRoot)
            } else {
                root = ($root ??= buildUriBuilderRoot(
                    "$root/", serializerSettings, serviceConfig, schema) as TRoot)
            }

            paramName = ensureAt(paramName)
            return new AtParam({ type: "Ref", data: { name: paramName, uri: ref(root), serializeAsObject } }) as any
        },

        createRefCollection<T>(paramName: string, values: Param<T>[]) {

            const vs = values.map(x => {
                if (x instanceof AtParam) return x
                throw new Error(`Parameter "${x.param.data.name}" from ` +
                    `collection "${paramName}" was generated incorrectly`)
            });

            paramName = ensureAt(paramName)
            return new AtParam({
                type: "Collection",
                data: { name: paramName, values: vs }
            }) as any
        },

        createConst<T>(paramName: string, value: T, paramType?: OutputTypes | undefined) {
            paramName = ensureAt(paramName)
            return new AtParam({
                type: "Const",
                data: { name: paramName, value, paramType: paramType && resolveOutputType(paramType) }
            }) as any
        },

        param(paramName: string) {

            paramName = ensureAt(paramName)
            return new AtParam({ type: "Param", data: { name: paramName } }) as any
        },

        createRawConst(paramName: string, value: string) {

            paramName = ensureAt(paramName)
            return new AtParam({
                type: "Const",
                data: { name: paramName, value, paramType: rawType }
            }) as any
        }
    }
}