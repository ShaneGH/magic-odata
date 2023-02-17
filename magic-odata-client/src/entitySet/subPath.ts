import { ODataComplexType, ODataServiceTypes, ODataTypeRef } from "magic-odata-shared";
import { Accept, EntitySetData, lookup, tryFindBaseType, tryFindPropertyType } from "./utils.js";

const $count = {};
const $value = {};

function buildSubPathProperties<TFetchResult, TResult, TSubPath>(
    data: EntitySetData<TFetchResult, TResult>,
    type: ODataTypeRef): TSubPath {

    if (type.isCollection) {
        return { $count } as any
    }

    const t = lookup(type, data.tools.root.types);
    if (t.flag === "Primitive" || t.flag === "Enum") {
        return { $value } as any
    }

    return listAllProperties(t.type, data.tools.root.types, true)
        .reduce((s, x) => ({ ...s, [x]: { propertyName: x } }), {} as any);
}

// might return duplicates if and child property names clash
function listAllProperties(
    type: ODataComplexType,
    root: ODataServiceTypes,
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
    propertyName: string
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
    } else if (!data.tools.type.isCollection) {
        propType = tryFindPropertyType(data.tools.type, newT.propertyName, data.tools.root.types)
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