import { Dict, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared"
import { rawType } from "../../valueSerializer.js"
import { args, functionCall, infixFn, infixFns, returnInputsCall, returnInputsCalls, types } from "../expressions/functionSignatureBuilders.js"
import { FunctionNamespaceMember, FunctionNamespace, FunctionNamespaceFunction } from "../expressions/functionSignatures.js"
import { filterUtilsNamespace, genericTypeNamespace } from "../expressions/utils.js"

const anyT: ODataTypeRef = { isCollection: false, name: "any", namespace: "" }
const stringT: ODataTypeRef = { isCollection: false, name: "string", namespace: "" }
const boolT: ODataTypeRef = { isCollection: false, name: "boolean", namespace: "" }
const numberT: ODataTypeRef = { isCollection: false, name: "number", namespace: "" }

function asNamespace(fns: FunctionNamespaceFunction[]) {
    return fns.reduce((s, x) => {
        if (!x.value.length) {
            throw new Error("Invalid function");
        }

        if (s[x.value[0].name]) {
            throw new Error("Duplicate function");
        }

        return { ...s, [x.value[0].name]: x }
    }, {} as FunctionNamespace)
}

function build$filter(): FunctionNamespaceMember {

    return {
        type: "ns",
        value: asNamespace([
            // Test functions. Will not be added to .d.ts file
            infixFns("__testOverloads", [
                [[args.gen("justReturnInput", "T")], types.genT("T")]
            ]),

            returnInputsCalls("filterRaw", [
                [[args.type("filter", rawType), args.outputType()], rawType],
                [[args.filterRawProps(), args.filterRawExecutor(), args.outputType()], rawType],
            ], ""),
            infixFn("eq", [args.gen("lhs", "T"), args.gen("rhs", "T"), args.mapper("mapper", types.gen("T"))], boolT),
            infixFn("and", [args.spread("conditions", boolT)], boolT),
            infixFn("add", [args.primitive("lhs", "number"), args.primitive("rhs", "number"), args.outputType("RealNumberTypes")], types.primitiveT("number")),
            infixFn("isIn", [args.gen("lhs", "T"), args.gens("rhs", "T"), args.mapper("mapper", types.gen("T"))], boolT, " in "),

            returnInputsCall("any", [args.gen("collection", "T", undefined, true), args.logicalCollectionOp(types.genT("T"))], boolT, ""),
            /*
            
        any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
            collection: QueryCollection<TQueryObj, TArrayType>,
            collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;
            */
        ])
    }
}

function build$select(): FunctionNamespaceMember {
    return {
        type: "ns",
        value: {}
    }
}

// TODO: centralise
const expansionT: ODataSingleTypeRef = { isCollection: false, namespace: "", name: "Expand" }
function build$expand(): FunctionNamespaceMember {
    return {
        type: "ns",
        value: asNamespace([
            returnInputsCall("expandRaw", [args.type("expandString", rawType)], expansionT, ""),
            functionCall("expandAll", [], expansionT),  // handled with a hack: REWRITE_NO_ARGS
            functionCall("expandRef", [], expansionT),  // handled with a hack: REWRITE_NO_ARGS
            returnInputsCall("expandCount", [args.expandCount(), args.expandAnd()], expansionT, ""),
            returnInputsCall("expand", [
                args.gen("obj", "T"),
                args.expandAnd()], expansionT, ",")
            //expand<T>(obj: QueryComplexObject<T> | QueryCollection<QueryComplexObject<T>, T>, and?: ((x: QueryComplexObject<T>) => Query | Query[]) | undefined): Expand;

        ])
    }
}

function build$orderby(): FunctionNamespaceMember {

    return {
        type: "ns",
        value: asNamespace([
            returnInputsCall("orderByRaw", [args.type("orderByString", rawType)], rawType, ""),
            returnInputsCall("orderBy", [args.orderBy()], rawType, ",")
        ])
    }
}

function build$search(): FunctionNamespaceMember {
    return {
        type: "ns",
        value: {}
    }
}

function build$top() {
    return returnInputsCall("$top", [args.type("top", numberT)], numberT, "")
}

function build$skip(): FunctionNamespaceMember {
    return returnInputsCall("$skip", [args.type("skip", numberT)], numberT, "")
}

function build$count(): FunctionNamespaceMember {
    return returnInputsCall("$count", [], numberT, "") // handled with a hack: REWRITE_NO_ARGS
}

function buildCustom(): FunctionNamespaceMember {
    return returnInputsCall("custom",
        [args.customQueryArg(), args.type("value", rawType)], rawType, ",")
}

// export function custom(paramName: string, value: string): Custom {
//     return {
//         $$oDataQueryObjectType: "Custom",
//         $$key: paramName,
//         $$value: value
//     }

// }
// // /
//     /**
//      * Add a custom query param
//      * @param paramName The name. If this param is added at the root query level, it's value will not be url encoded. Otherwise it will
//      * @param value The value
//      * @example custom("$filter", "name eq 'John'")
//      */
//     custom: typeof custom

export const querySymbols = {
    $filter: Symbol("$filter"),
    $select: Symbol("$select"),
    $expand: Symbol("$expand"),
    $orderby: Symbol("$orderby"),
    $search: Symbol("$search"),
    $top: Symbol("$top"),
    $skip: Symbol("$skip"),
    $count: Symbol("$count"),
    custom: Symbol("custom")
}

export const querySymbolNames = {
    [querySymbols.$filter]: "$filter",
    [querySymbols.$select]: "$select",
    [querySymbols.$expand]: "$expand",
    [querySymbols.$orderby]: "$orderby",
    [querySymbols.$search]: "$search",
    [querySymbols.$top]: "$top",
    [querySymbols.$skip]: "$skip",
    [querySymbols.$count]: "$count",
    [querySymbols.custom]: "custom"
}

export const { querySymbolDict, querySymbolNameDict } = Object
    .keys(querySymbols)
    .reduce((s, x) => ({
        querySymbolDict: {
            ...s.querySymbolDict,
            [x]: (querySymbols as any)[x]
        },
        querySymbolNameDict: {
            ...s.querySymbolNameDict,
            [(querySymbols as any)[x]]: x
        }
    }), {
        querySymbolDict: {} as Dict<symbol>,
        querySymbolNameDict: {} as { [k: symbol]: string }
    })

export const filterUtils: FunctionNamespace = {
    [querySymbols.$filter]: build$filter(),
    [querySymbols.$select]: build$select(),
    [querySymbols.$expand]: build$expand(),
    [querySymbols.$orderby]: build$orderby(),
    [querySymbols.$search]: build$search(),
    [querySymbols.$top]: build$top(),
    [querySymbols.$skip]: build$skip(),
    [querySymbols.$count]: build$count(),
    [querySymbols.custom]: buildCustom()
}