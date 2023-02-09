import { ODataComplexType, ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared";
import { typeNameString } from "../utils.js";
import { EntitySetData, getDeepTypeRef } from "./utils.js";


// https://github.com/ShaneGH/magic-odata/issues/4
function buildCaster<TFetchResult, TResult, TCaster>(
    data: EntitySetData<TFetchResult, TResult>): TCaster {

    const { namespace, name, isCollection } = getCastingTypeRef(data.tools.type);

    const inherits = Object
        .keys(data.tools.root.types)
        .map(ns => Object
            .keys(data.tools.root.types[ns])
            .map(t => data.tools.root.types[ns][t]))
        .reduce((s, x) => [...s, ...x], [])
        .filter(x => x.containerType === "ComplexType"
            && ((x.type.baseType
                && x.type.baseType.namespace === namespace
                && x.type.baseType.name === name)
                || x.type.namespace === namespace
                && x.type.name === name))
        .map(x => x.type as ODataComplexType)
        .map((x: ODataComplexType): ODataSingleTypeRef => ({
            isCollection: false,
            name: x.name,
            namespace: x.namespace
        }));

    const distinctNames = Object.keys(inherits
        .reduce((s, x) => ({ ...s, [x.name]: true }), {} as { [key: string]: boolean }))

    const getName = inherits.length === distinctNames.length
        ? (x: ODataSingleTypeRef) => x.name
        // https://github.com/ShaneGH/magic-odata/issues/5
        : (x: ODataSingleTypeRef) => `${x.namespace}/${x.name}`.replace(/[^\w]/g, "_")

    const reAddCollection = (t: ODataSingleTypeRef): ODataTypeRef => isCollection
        ? { isCollection: true, collectionType: t }
        : t;

    return inherits
        .reduce((s, type) => ({
            ...s,
            [getName(type)]: (): CastSelection<any> => {
                return {
                    type: reAddCollection(type)
                }
            }
        }), {} as any);
}

// unwraps an ODataTypeRef to 0 or 1 levels of collections or throws an error
function getCastingTypeRef(type: ODataTypeRef) {

    const result = getDeepTypeRef(type);
    if (result.collectionDepth > 1) {
        throw new Error("Casting collections of collections is not yet supported");
    }

    return {
        namespace: result.namespace,
        name: result.name,
        isCollection: result.collectionDepth === 1
    }
}

export type CastSelection<TNewEntityQuery> = {
    type: ODataTypeRef
}

export function recontextDataForCasting<TFetchResult, TResult, TCaster, TNewEntityQuery>(
    data: EntitySetData<TFetchResult, TResult>,
    cast: (caster: TCaster) => CastSelection<TNewEntityQuery>) {

    if (data.state.query) {
        throw new Error("You cannot add query components before casting");
    }

    const newT = cast(buildCaster(data));
    const type = getCastingTypeRef(newT.type);

    const fullyQualifiedName = typeNameString(type, ".");
    const path = data.state.path?.length ? [...data.state.path, fullyQualifiedName] : [fullyQualifiedName];

    return {
        tools: { ...data.tools, type: newT.type },
        state: { ...data.state, path }
    };
}