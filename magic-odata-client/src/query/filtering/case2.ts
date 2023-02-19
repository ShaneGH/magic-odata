import { Filter } from "../../queryBuilder.js";

export function caseExpression(...cases: [Filter | true, Filter][]): Filter {
    if (!cases.length) {
        throw new Error("A caseExpression must include at least 1 case");
    }

    const $$root = cases
        .filter(x => x[0] !== true && x[0].$$root || x[1].$$root)
        .map(x => (x[0] as Filter).$$root || x[1].$$root)[0]

    const $$output = cases
        .filter(x => x[1].$$output)
        .map(x => x[1].$$output)[0]

    const caseStrings = cases
        .map(x => `${x[0] === true ? "true" : x[0].$$filter}:${x[1].$$filter}`)
        .join(",");

    return {
        $$oDataQueryObjectType: "Filter",
        $$filter: `case(${caseStrings})`,
        $$output,
        $$root,
    }
}