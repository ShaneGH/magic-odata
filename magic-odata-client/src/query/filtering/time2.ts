import { ODataTypeRef, ODataServiceTypes } from "magic-odata-shared";
import { EdmDateTimeOffset, EdmDuration, ODataDateTimeOffset, ODataDuration } from "../../edmTypes.js";
import { Filter } from "../../queryBuilder.js";
import { serialize } from "../../valueSerializer.js";
import { QueryObjectType } from "../queryComplexObjectBuilder.js";
import { combineFilterStrings, getOperableFilterString, Operable } from "./operable0.js";
import { DecimalNumberTypes, NonNumericTypes, resolveOutputType } from "./queryPrimitiveTypes0.js";

const doubleT = resolveOutputType(DecimalNumberTypes.Double)
const durationT = resolveOutputType(NonNumericTypes.Duration)
const dateTimeOffsetT = resolveOutputType(NonNumericTypes.DateTimeOffset)

type OperableOrvalue =
    | { type: "Op", op: Operable<any> }
    | { type: "Value", value: any, typeRef?: ODataTypeRef, root?: ODataServiceTypes }

function tryRoot(x: OperableOrvalue) {
    return (x.type === "Op" && x.op.$$oDataQueryObjectType === "Filter" && x.op.$$root)
        || (x.type === "Op" && x.op.$$oDataQueryObjectType === QueryObjectType.QueryPrimitive && x.op.$$oDataQueryMetadata.root)
        || (x.type === "Op" && x.op.$$oDataQueryObjectType === QueryObjectType.QueryEnum && x.op.$$oDataQueryMetadata.root)
        || (x.type === "Value" && x.root)
        || null
}

function arithmeticInfixOp(
    lhs: OperableOrvalue,
    operator: string,
    rhs: OperableOrvalue,
    output: ODataTypeRef | undefined): Filter {

    const lhsV = lhs.type === "Op"
        ? getOperableFilterString(lhs.op)
        : serialize(lhs.value, lhs.typeRef, lhs.root)

    const rhsV = rhs.type === "Op"
        ? getOperableFilterString(rhs.op)
        : serialize(rhs.value, rhs.typeRef, rhs.root)

    const root = tryRoot(lhs) || tryRoot(rhs) || undefined;
    return combineFilterStrings(` ${operator} `, output, root, lhsV, rhsV);
}

function isOpDuration(x: any) {
    if (!x) return false;

    if (x.$$oDataQueryObjectType === QueryObjectType.QueryPrimitive
        && x.$$oDataQueryMetadata?.typeRef
        && !x.$$oDataQueryMetadata.typeRef.isCollection
        && x.$$oDataQueryMetadata.typeRef.namespace === "Edm"
        && x.$$oDataQueryMetadata.typeRef.name === NonNumericTypes.Duration) {

        return true
    }

    if (typeof x === "number") return true
    if (typeof x === "string") return true
    if (x instanceof ODataDuration) return true

    return false;
}

function isOpDateTimeOffset(x: any) {
    if (!x) return false;

    if (x.$$oDataQueryObjectType === QueryObjectType.QueryPrimitive
        && x.$$oDataQueryMetadata?.typeRef
        && !x.$$oDataQueryMetadata.typeRef.isCollection
        && x.$$oDataQueryMetadata.typeRef.namespace === "Edm"
        && x.$$oDataQueryMetadata.typeRef.name === NonNumericTypes.DateTimeOffset) {

        return true
    }

    if (typeof x === "string") return true
    if (x instanceof Date) return true
    if (x instanceof ODataDateTimeOffset) return true

    return false;
}

function toOperableOrValue(x: any, fallbackType: ODataTypeRef | undefined, fallbackRoot: ODataServiceTypes | undefined): OperableOrvalue {
    return typeof x?.$$oDataQueryObjectType === "string"
        ? { type: "Op", op: x }
        : { type: "Value", value: x, typeRef: fallbackType, root: fallbackRoot }
}

function root(x: Operable<EdmDateTimeOffset>) {
    return x.$$oDataQueryObjectType === "Filter"
        ? x.$$root
        : x.$$oDataQueryMetadata?.root
}

export function addTime(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;
export function addTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDateTimeOffset> | EdmDateTimeOffset): Filter;
export function addTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;
export function addTime(lhs: Operable<any>, rhs: any): Filter {

    if (isOpDateTimeOffset(lhs) && isOpDuration(rhs)) {
        return arithmeticInfixOp(
            { type: "Op", op: lhs },
            "add",
            toOperableOrValue(rhs, durationT, root(lhs)),
            dateTimeOffsetT)
    }

    if (isOpDuration(lhs) && isOpDuration(rhs)) {
        return arithmeticInfixOp(
            { type: "Op", op: lhs },
            "add",
            toOperableOrValue(rhs, durationT, root(lhs)),
            durationT)
    }

    if (isOpDuration(lhs) && isOpDateTimeOffset(rhs)) {
        return arithmeticInfixOp(
            { type: "Op", op: lhs },
            "add",
            toOperableOrValue(rhs, dateTimeOffsetT, root(lhs)),
            dateTimeOffsetT)
    }

    throw new Error("Invalid method overload");
}

export function subTime(lhs: Operable<EdmDateTimeOffset>, rhs: Operable<EdmDuration> | EdmDuration): Filter;
export function subTime(lhs: EdmDateTimeOffset, rhs: Operable<EdmDuration>): Filter;
export function subTime(lhs: Operable<EdmDuration>, rhs: Operable<EdmDuration> | EdmDuration): Filter;
export function subTime(lhs: any, rhs: any): Filter {

    if (isOpDateTimeOffset(lhs) && isOpDuration(rhs)) {
        return arithmeticInfixOp(
            toOperableOrValue(lhs, dateTimeOffsetT, root(rhs)),
            "sub",
            toOperableOrValue(rhs, durationT, root(lhs)),
            dateTimeOffsetT)
    }

    if (isOpDuration(lhs) && isOpDuration(rhs)) {
        return arithmeticInfixOp(
            toOperableOrValue(lhs, durationT, root(rhs)),
            "sub",
            toOperableOrValue(rhs, durationT, root(lhs)),
            durationT)
    }

    throw new Error("Invalid method overload");
}

export function mulTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter {
    return arithmeticInfixOp(
        toOperableOrValue(lhs, durationT, root(lhs)),
        "mul",
        toOperableOrValue(rhs, doubleT, root(lhs)),
        durationT)
}

export function divTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter {
    return arithmeticInfixOp(
        toOperableOrValue(lhs, durationT, root(lhs)),
        "div",
        toOperableOrValue(rhs, doubleT, root(lhs)),
        durationT)
}

export function divByTime(lhs: Operable<EdmDuration>, rhs: Operable<number> | number): Filter {
    return arithmeticInfixOp(
        toOperableOrValue(lhs, durationT, root(lhs)),
        "divby",
        toOperableOrValue(rhs, doubleT, root(lhs)),
        durationT)
}