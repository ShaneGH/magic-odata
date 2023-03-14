import { Dict, ODataSchema, ODataTypeName } from "magic-odata-shared";
import { DecimalNumberTypes, IntegerTypes, NonNumericTypes, ODataTypeRef } from "../../index.js";
import { typeNameString } from "../utils.js";
import { magicODataTypeNamespace } from "./expressions/utils.js";
import { dir } from "./uriBuilder/utils.js";

const numberAssignments: [string, string][] = Object
    .keys(IntegerTypes)
    .concat(Object.keys(DecimalNumberTypes))
    .concat([NonNumericTypes.Byte, NonNumericTypes.SByte])
    .flatMap(x => [
        ["number", `Edm.${x}`],
        [`Edm.${x}`, "number"]
    ])
    .concat([
        ["number", `Edm.${NonNumericTypes.Duration}`]
    ]) as [string, string][]

const booleanAssignments: [string, string][] = [NonNumericTypes.Boolean]
    .flatMap(x => [
        ["boolean", `Edm.${x}`],
        [`Edm.${x}`, "boolean"]
    ])
    .concat([
        ["number", `Edm.${NonNumericTypes.Duration}`]
    ]) as [string, string][]

const stringAssignments = [
    NonNumericTypes.String,
    NonNumericTypes.Guid,
    NonNumericTypes.Binary
]
    .flatMap(x => [
        ["string", `Edm.${x}`],
        [`Edm.${x}`, "string"]
    ])
    .concat([
        NonNumericTypes.Date,
        NonNumericTypes.DateTimeOffset,
        NonNumericTypes.Duration,
        NonNumericTypes.TimeOfDay
    ]
        .map(edm => ["string", `Edm.${edm}`] as [string, string])) as [string, string][]

const dateAssignments = [
    NonNumericTypes.Date,
    NonNumericTypes.DateTimeOffset,
    NonNumericTypes.TimeOfDay
]
    .map(edm => ["Date", `Edm.${edm}`] as [string, string])

const miscAssignments: [string, string][] = [
    [`${magicODataTypeNamespace}.ODataDate`, `Edm.${NonNumericTypes.Date}`],
    [`${magicODataTypeNamespace}.ODataTimeOfDay`, `Edm.${NonNumericTypes.TimeOfDay}`],
    [`${magicODataTypeNamespace}.ODataDateTimeOffset`, `Edm.${NonNumericTypes.DateTimeOffset}`],
    [`${magicODataTypeNamespace}.ODataDuration`, `Edm.${NonNumericTypes.Duration}`]
]

const implicitAssignments = numberAssignments
    .concat(booleanAssignments)
    .concat(stringAssignments)
    .concat(dateAssignments)
    .concat(miscAssignments)
    .flatMap(x => [
        x,
        // NOTE: do not have "any" conversion work the other way
        // With recursive lookup, this would allow any type to be 
        // converted to any other type
        [x[0], "any"]
    ] as [string, string][])
    .reduce((s, [from, to]) => s[from]
        ? { ...s, [from]: [...s[from], to] }
        : { ...s, [from]: [to] }, {} as Dict<string[]>)

function isSubtypeOf(child: ODataTypeName, parent: ODataTypeName, schemas: Dict<ODataSchema>): boolean {
    if (child.namespace === parent.namespace && child.name === parent.name) return true

    const childT = schemas[child.namespace]?.types[child.name]
    if (!childT
        || childT.containerType !== "ComplexType"
        || !childT.type.baseType) return false

    if (childT.type.baseType.namespace === parent.namespace
        && childT.type.baseType.name === parent.name) return true

    return isSubtypeOf(childT.type.baseType, parent, schemas)
}

function hasImplicitAssignment(from: string, to: string, done: Dict<true>): boolean {

    if (to === "any") return true
    if (from === to) return true
    if (done[from]) return false
    if (!implicitAssignments[from]) return false
    if (implicitAssignments[from].includes(to)) return true

    done = { ...done, [from]: true }
    return implicitAssignments[from]
        .reduce((s, x) => s || hasImplicitAssignment(x, to, done), false)
}

function _isAssignableTo(from: ODataTypeRef, to: ODataTypeRef, schemas: Dict<ODataSchema>): boolean {
    if (from.isCollection) {
        return to.isCollection && _isAssignableTo(from.collectionType, to.collectionType, schemas)
    }

    if (to.isCollection) return false
    if (from.namespace === to.namespace && from.name === to.name) return true
    if (isSubtypeOf(from, to, schemas)) return true

    return hasImplicitAssignment(typeNameString(from, "."), typeNameString(to, "."), {})
}

/** from and to can be sum types if the array contains more than 1 element */
export function isAssignableTo(from: ODataTypeRef[], to: ODataTypeRef[], schemas: Dict<ODataSchema>): boolean {
    return !!from.length && from
        .reduce((s, _from) => s
            && to.reduce((s, _to) => s || _isAssignableTo(_from, _to, schemas), false), true)
}