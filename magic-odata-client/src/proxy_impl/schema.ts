import { DefaultResponseInterceptor, ODataSchema, ODataServiceConfig, RequestTools } from "../../index.js";
import { entityContainer } from "./entityContainer.js";

function scopedSchema<T extends object, TFetchResult, TResult>(
    tools: SchemaTools<TFetchResult, TResult>,
    schemaName: string, schema: ODataSchema, scope: string[]): T {

    return new Proxy<T>({} as any, {
        get(target: T, p: string | symbol, receiver: any): any {

            const currentScopeParts = scope.concat([String(p)])

            // TODO: duplicated logic on separator between projects
            const separator = "[^\\w_]"
            const currentScope = currentScopeParts
                .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join(separator)

            const partialScope = new RegExp("^" + currentScope + separator)
            const fullScope = new RegExp("^" + currentScope + "$")

            for (let k in schema.entityContainers) {
                if (fullScope.test(k)) {
                    return entityContainer(tools, schemaName, k)
                }

                if (partialScope.test(k)) {
                    return scopedSchema(tools, schemaName, schema, currentScopeParts)
                }
            }

            throw new Error(`Invalid container part: ${currentScopeParts.join(".")}`)
        }
    })
}

export type SchemaTools<TFetchResult, TResult> = {
    requestTools: RequestTools<TFetchResult, TResult>,
    defaultResponseInterceptor: DefaultResponseInterceptor<TFetchResult, TResult>,
    root: ODataServiceConfig
    schema: ODataSchema
}


export function schema<T extends object>(
    tools: SchemaTools<any, any>,
    schemaName: string): T {
    const schema = tools.root.schemaNamespaces[schemaName]
    if (!schema) {
        throw new Error(`Invalid schema name "${schemaName}"`);
    }

    return scopedSchema(tools, schemaName, schema, [])
}