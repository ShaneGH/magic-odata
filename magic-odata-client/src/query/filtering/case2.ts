import { Filter, FilterEnv, FilterResult } from "../../queryBuilder.js";
import { Reader } from "../../utils.js";
import { NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const trueT = resolveOutputType(NonNumericTypes.Boolean)

export function caseExpression(...cases: [Filter | true, Filter][]): Filter {
    if (!cases.length) {
        throw new Error("A caseExpression must include at least 1 case");
    }

    let casesF = Reader.traverse(...cases
        .map(c => Reader.create<FilterEnv, [FilterResult, FilterResult]>(env =>
            [c[0] === true ? { $$output: trueT, $$filter: "true" } : c[0].apply(env), c[1].apply(env)])))

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