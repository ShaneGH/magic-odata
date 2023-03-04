import { ODataComplexType, ODataTypeRef, Function as ODataFunction, ODataEntitySet, Dict, ODataSchema } from "magic-odata-shared";
import { serialize } from "../valueSerializer.js";
import { Accept, EntitySetData, lookup, tryFindBaseType, tryFindPropertyType } from "./utils.js";

const $count = {};
const $value = {};

function buildSubPathProperties<TFetchResult, TResult, TSubPath>(
    data: EntitySetData<TFetchResult, TResult>,
    type: ODataTypeRef): TSubPath {

    if (type.isCollection) {

        const functions = listAllEntitySetFunctionsGrouped(data.tools.entitySet, data.tools.root.schemaNamespaces)
            .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any);

        return {
            ...functions,
            $count
        } as any
    }

    const t = lookup(type, data.tools.root.schemaNamespaces);
    if (t.flag === "Primitive" || t.flag === "Enum") {
        return { $value } as any
    }

    const props = listAllProperties(t.type, data.tools.root.schemaNamespaces, true)
        .reduce((s, x) => ({ ...s, [x]: { propertyName: x } }), {} as any);

    const functions = listAllEntityFunctionsGrouped(t.type, data.tools.root.schemaNamespaces)
        .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any);

    return {
        ...functions,
        ...props
    }
}

function buildFunctions(groupedFunctions: { [k: string]: ODataFunction[] }, root: Dict<ODataSchema>): [string, (x: any) => SubPathSelection<any>][] {

    return Object
        .keys(groupedFunctions)
        .map(key => {
            const functions = groupedFunctions[key]
            return [key, (x: any) => {

                const fn = functions.filter(fn => {
                    const argNames = ((x && Object.keys(x)) || [])
                    const fnParams = fn.params.filter(x => !x.isBindingParameter)

                    for (let i = 0; i < fnParams.length; i++) {
                        if (fnParams[i].isBindingParameter) continue

                        const ix = argNames.indexOf(fnParams[i].name)
                        if (ix === -1) return false

                        argNames.splice(ix, 1)
                    }

                    return argNames.length === 0
                })[0]

                if (!fn) {
                    throw new Error(`Unknown function args for function ${key}(${(x && Object.keys(x)) || ""})`);
                }

                const params = fn.params
                    .filter(x => !x.isBindingParameter)
                    .map(param => `${param.name}=${serialize(x[param.name], param.type, root)}`)
                    .join(",");

                const output: SubPathSelection<any> = { propertyName: `${key}(${params})`, outputType: fn.returnType }
                return output
            }]
        })
}

function listAllEntityFunctionsGrouped(
    type: ODataComplexType,
    root: Dict<ODataSchema>,
    includeParent = true): [string, (x: any) => SubPathSelection<any>][] {

    const groupedFunctions = groupFunctions(listAllEntityFunctionsUngrouped(type, root, includeParent))
    return buildFunctions(groupedFunctions, root)
}

function groupFunctions(functions: ODataFunction[]) {
    return functions
        .reduce((s, x) => s[x.name]
            ? {
                ...s,
                [x.name]: [...s[x.name], x]
            }
            : {
                ...s,
                [x.name]: [x]
            }, {} as { [k: string]: ODataFunction[] })
}

function listAllEntitySetFunctionsGrouped(
    entitySet: ODataEntitySet,
    root: Dict<ODataSchema>): [string, (x: any) => SubPathSelection<any>][] {

    const groupedFunctions = groupFunctions(entitySet.collectionFunctions)
    return buildFunctions(groupedFunctions, root)
}

function listAllEntityFunctionsUngrouped(
    type: ODataComplexType,
    root: Dict<ODataSchema>,
    includeParent: boolean): ODataFunction[] {

    const parent = includeParent
        ? tryFindBaseType(type, root)
        : null;

    return parent
        ? listAllEntityFunctionsUngrouped(parent, root, true).concat(type.functions)
        : type.functions
}

// might return duplicates if parent and child property names clash
function listAllProperties(
    type: ODataComplexType,
    root: Dict<ODataSchema>,
    includeParent = true): string[] {

    const parent = includeParent
        ? tryFindBaseType(type, root)
        : null;

    return Object
        .keys(type.properties)
        .concat(parent
            ? listAllProperties(parent, root, true)
            : []);
}

export type SubPathSelection<TNewEntityQuery> = {
    propertyName: string,
    outputType?: ODataTypeRef
}

export function recontextDataForSubPath<TFetchResult, TResult, TSubPath, TNewEntityQuery>(
    data: EntitySetData<TFetchResult, TResult>,
    subPath: (pathSelector: TSubPath) => SubPathSelection<TNewEntityQuery>) {

    if (data.state.query) {
        throw new Error("You cannot add query components before navigating a sub path");
    }

    let propType: ODataTypeRef | null = null
    const newT = subPath(buildSubPathProperties(data, data.tools.type));
    if (newT === $value) {
        propType = data.tools.type
    } else if (newT === $count && data.tools.type.isCollection) {
        propType = data.tools.type.collectionType
    } else if (newT.outputType) {
        propType = newT.outputType
    } else if (!data.tools.type.isCollection) {
        propType = tryFindPropertyType(data.tools.type, newT.propertyName, data.tools.root.schemaNamespaces)
    }

    if (!propType) {
        throw new Error(`Invalid property ${newT.propertyName}`);
    }

    const propName = newT === $value
        ? "$value"
        : newT === $count
            ? "$count"
            : newT.propertyName

    const path = data.state.path?.length ? [...data.state.path, propName] : [propName];

    return {
        tools: { ...data.tools, type: propType },
        state: {
            ...data.state,
            path,
            accept: newT === $value
                ? Accept.Raw
                : newT === $count
                    ? Accept.Integer
                    : data.state.accept
        }
    }
}