import { ODataComplexType, ODataServiceTypes, ODataTypeName } from "magic-odata-shared";
import { EntitySetData, lookupComplex, tryFindBaseType, tryFindPropertyType } from "./utils.js";


function buildSubPathProperties<TFetchResult, TResult, TSubPath>(
    data: EntitySetData<TFetchResult, TResult>,
    type: ODataTypeName): TSubPath {

    return listAllProperties(lookupComplex(type, data.tools.root.types), data.tools.root.types, true)
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

    if (data.tools.type.isCollection) {
        console.log(data.tools.type)
        throw new Error("You cannot navigate the subpath of a collection. Try to filter by key first");
    }

    const newT = subPath(buildSubPathProperties(data, data.tools.type));
    const prop = tryFindPropertyType(data.tools.type, newT.propertyName, data.tools.root.types);
    if (!prop) {
        throw new Error(`Invalid property ${newT.propertyName}`);
    }

    const path = data.state.path?.length ? [...data.state.path, newT.propertyName] : [newT.propertyName];

    return {
        tools: { ...data.tools, type: prop },
        state: { ...data.state, path }
    }
}