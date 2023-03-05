import { ParameterDefinition } from "../../entitySet/params.js";
import { Filter, FilterEnv, FilterResult, QbEmit } from "../../queryBuilder.js";
import { ReaderWriter } from "../../utils.js";
import { NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const trueT = resolveOutputType(NonNumericTypes.Boolean)

export function caseExpression(...cases: [Filter | true, Filter][]): Filter {
    if (!cases.length) {
        throw new Error("A caseExpression must include at least 1 case");
    }

    const casesF = ReaderWriter.traverse(cases
        .map(([condition, result]) => [
            condition === true
                ? ReaderWriter.retn<FilterResult, QbEmit>(QbEmit.zero, { $$output: trueT, $$filter: "true" })
                : condition,
            result] as [Filter, Filter])
        .map(([condition, result]) => condition.bind(c => result.map(r => [c, r] as [FilterResult, FilterResult]))), QbEmit.zero)

    return casesF
        .map(cases => {
            const $$output = cases
                .map(x => x[1].$$output)
                .filter(x => !!x)[0]

            const caseStrings = cases
                .map(x => `${x[0].$$filter}:${x[1].$$filter}`)
                .join(",");

            return {
                $$output,
                $$filter: `case(${caseStrings})`
            }
        })
}