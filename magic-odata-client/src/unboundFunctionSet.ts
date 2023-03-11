import { recontextDataForUnboundFunctions, SubPathSelection, UnboundFunctionSetTools } from "./entitySet/subPath.js";
import { RequestBuilder } from "./requestBuilder.js";
import { Params } from "./entitySetInterfaces.js";

export class UnboundFunctionSet<TRoot, TSubPath, TFetchResult> {

    constructor(
        private readonly tools: UnboundFunctionSetTools<TFetchResult, any>,
        private disableHttp = false) {
    }

    subPath<TNewEntityQuery>(
        selector: (entity: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): TNewEntityQuery {
        const { state, tools } = recontextDataForUnboundFunctions(this.tools, selector)
        return new RequestBuilder<TRoot, any, any, any, any, any, any, any>(tools, null, state, this.disableHttp) as TNewEntityQuery;
    }
}