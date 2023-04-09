import { Levels } from "../queryBuilder.js";

/**
 * http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ExpandOptionlevels
 */
export function levels(levels: number): Levels {
    return {
        $$oDataQueryObjectType: "Levels",
        $$levels: levels
    }
}