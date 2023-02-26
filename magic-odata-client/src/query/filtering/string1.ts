import { ODataTypeRef } from "magic-odata-shared";
import { Filter, FilterEnv, FilterResult } from "../../queryBuilder.js";
import { Reader } from "../../utils.js";
import { serialize } from "../../valueSerializer.js";
import { functionCall } from "./op1.js";
import { combineFilterStrings, Operable, operableToFilter } from "./operable0.js";
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const stringT = resolveOutputType(NonNumericTypes.String)
const boolT = resolveOutputType(NonNumericTypes.Boolean)
const int32T = resolveOutputType(IntegerTypes.Int32)

function toFilter(x: Operable<string> | string) {
    return typeof x === "string"
        ? Reader.create<FilterEnv, FilterResult>(env => ({
            $$output: stringT,
            $$filter: serialize(x, stringT, env.serviceConfig.types)
        }))
        : operableToFilter(x);
}

export function concat(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function concat(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function concat(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("concat", [lhs, rhs], stringT)
}

function stringFunction(name: string, stringArgs: (Operable<string> | string)[], result: ODataTypeRef): Filter {

    return functionCall(name, stringArgs.map(toFilter), result)
}

export function matchesPattern(string: Operable<string>, rhs: Operable<string> | string): Filter;
export function matchesPattern(string: Operable<string> | string, pattern: Operable<string>): Filter;
export function matchesPattern(string: Operable<string> | string, pattern: Operable<string> | string): Filter {

    return stringFunction("matchesPattern", [string, pattern], boolT);
}

export function contains(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function contains(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function contains(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("contains", [lhs, rhs], boolT);
}

export function startsWith(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function startsWith(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function startsWith(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("startswith", [lhs, rhs], boolT);
}

export function endsWith(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function endsWith(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function endsWith(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("endswith", [lhs, rhs], boolT);
}

export function indexOf(lhs: Operable<string>, rhs: Operable<string> | string): Filter;
export function indexOf(lhs: Operable<string> | string, rhs: Operable<string>): Filter;
export function indexOf(lhs: Operable<string> | string, rhs: Operable<string> | string): Filter {

    return stringFunction("indexof", [lhs, rhs], int32T);
}

export function toLower(lhs: Operable<string>): Filter {

    return stringFunction("tolower", [lhs], stringT);
}

export function toUpper(lhs: Operable<string>): Filter {

    return stringFunction("toupper", [lhs], stringT);
}

export function trim(lhs: Operable<string>): Filter {

    return stringFunction("trim", [lhs], stringT);
}

export function length(lhs: Operable<string>): Filter {

    return stringFunction("length", [lhs], int32T);
}

export function subString(lhs: Operable<string>, start: number, length?: number): Filter {

    return operableToFilter(lhs)
        .map(({ $$filter }) => ({
            $$output: stringT,
            $$filter: length == null
                ? `substring(${$$filter},${start})`
                : `substring(${$$filter},${start},${length})`
        }));
}