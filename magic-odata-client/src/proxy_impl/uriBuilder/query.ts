import { ODataTypeRef } from "magic-odata-shared";
import { ReaderState } from "../../utils.js";
import { asExpression } from "../expressions/expressions.js";
import { RootSymbolExpression } from "../expressions/rootSymbolExpression.js";
import { querySymbolNameDict } from "../inbuiltFunctions/functions.js";
import { Recorder } from "../uriEvents/eventBuilder.js";
import { evaluateExpression } from "./expressionEvaluator.js";
import { dir, log, MappingUtils, UriRoughwork } from "./utils.js";

function getQueryParamName(symbol: RootSymbolExpression | null, query: string | null) {

    if (symbol) {
        if (querySymbolNameDict[symbol.name] === "custom" && symbol.contextName) {
            return symbol.contextName
        }

        if (!!querySymbolNameDict[symbol.name]) {
            return querySymbolNameDict[symbol.name]
        }
    }

    query = query && `: ${query}`
    const sy = (symbol && ` (${String(symbol.name)})`) || ""
    throw new Error(`Could not find correct query param for query${sy}${query}`)
}

function mapSingleQuery(recorder: Recorder, queryType: ODataTypeRef): ReaderState<MappingUtils, any, UriRoughwork> {

    return asExpression(null, recorder)
        .mapEnv<MappingUtils>(utils => ({ utils, queryType }))
        .asReaderState<UriRoughwork>()
        .bind(([expr, exprParamMappings]) => {
            if (!expr) {
                return ReaderState.retn(null)
            }

            return ReaderState.create((env, s) => {

                let [[category, queryExpr], paramMappings] = evaluateExpression(expr).execute(env)
                s = { ...s, paramMappings: s.paramMappings.concat(paramMappings).concat(exprParamMappings) }

                const param = getQueryParamName(category, queryExpr)

                // TODO: REWRITE_NO_ARGS try to remove these exceptions from query.ts
                if (param === "$count" && !queryExpr) queryExpr = "true"
                if (param === "$expand" && queryExpr === "expandAll()") queryExpr = "*"
                if (param === "$expand" && queryExpr === "expandRef()") queryExpr = "*/$ref"

                if (!queryExpr) {
                    return [null, s]
                }

                if (s.oDataUriParts.query[param]) {
                    throw new Error([
                        `Multiple "${param}" clauses detected`,
                        " * Combine multiple $filter clauses with $filter.and or $filter.or",
                        " * Combine multiple $expand clauses with $expand.combine",
                        " * Combine multiple $select clauses by passing multiple items into the $select.select() method"
                    ].join("\n"));
                }

                return [
                    null,
                    {
                        ...s,
                        oDataUriParts: {
                            ...s.oDataUriParts,
                            query: {
                                ...s.oDataUriParts.query,
                                [param]: (queryExpr && env.encodeURIComponent(queryExpr)) || ""
                            }
                        }
                    }
                ]
            })
        });
}

export function mapQuery(recorded: Recorder[], queryType: ODataTypeRef): ReaderState<MappingUtils, any, UriRoughwork> {

    if (!recorded.length) {
        return ReaderState.retn(null)
    }

    const [head, ...tail] = recorded
    return mapSingleQuery(head, queryType)
        .bind(mapQuery.bind(null, tail, queryType))
}