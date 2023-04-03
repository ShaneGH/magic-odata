import { recontextDataForUnboundFunctions, SubPathSelection, UnboundFunctionSetTools } from "./entitySet/subPath.js";
import { RequestBuilder } from "./requestBuilder.js";
import { Params } from "./entitySetInterfaces.js";

export class UnboundFunctionSet<TRoot, TSubPath, TFetchResult> {

    constructor(
        private readonly tools: UnboundFunctionSetTools<TFetchResult, any>,
        private readonly disableHttp = false,
        private readonly encodeUri = true) {
    }

    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {
        const state = recontextDataForUnboundFunctions(this.tools, selector, this.encodeUri)
        const tools = {
            requestTools: this.tools.requestTools,
            defaultResponseInterceptor: this.tools.defaultResponseInterceptor,
            schema: this.tools.schema,
            root: this.tools.root,
            serializerSettings: this.tools.serializerSettings
        }

        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(tools, null, null, state, this.disableHttp) as TNewEntityQuery;
    }
}