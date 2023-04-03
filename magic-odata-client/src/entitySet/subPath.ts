import { ODataComplexType, ODataTypeRef, Function as ODataFunction, ODataEntitySet, Dict, ODataSchema, ODataServiceConfig, Function } from "magic-odata-shared";
import { IEntitySet, Params } from "../entitySetInterfaces.js";
import { QbEmit } from "../queryBuilder.js";
import { Writer } from "../utils.js";
import { SerializerSettings, serialize } from "../valueSerializer.js";
import { params } from "./params.js";
import { DefaultResponseInterceptor, RequestTools } from "./requestTools.js";
import { Accept, RequestBuilderData, lookup, tryFindBaseType, tryFindPropertyType, defaultAccept, EntityQueryState } from "./utils.js";

const $count = {};
const $value = {};

function buildSubPathProperties<TFetchResult, TResult, TSubPath>(
    data: RequestBuilderData<TFetchResult, TResult>,
    type: ODataTypeRef,
    encodeUri: boolean): TSubPath {

    if (type.isCollection) {

        const functions = data.entitySet
            ? listAllEntitySetFunctionsGrouped(data.entitySet, data.tools.serializerSettings, encodeUri)
                .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any)
            : {};

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

    const functions = listAllEntityFunctionsGrouped(t.type, data.tools.serializerSettings, encodeUri)
        .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any);

    return {
        ...functions,
        ...props
    }
}

export function functionUriBuilder(functionName: string, serializerSettings: SerializerSettings, functions: Function[], encodeUri: boolean): (x: any) => SubPathSelection<any> {

    const _serialize: typeof serialize = (x, y, z) => {

        // TODO: This is a hack. Serializing $$oDataQueryObjectType objects
        // needs to be done within a FilterEnv Reader for the rootContext
        if (typeof x?.$$oDataQueryObjectType === "string"
            && x.$$oDataQueryMetadata
            && Array.isArray(x.$$oDataQueryMetadata.path)) {

            return Writer.create(x.$$oDataQueryMetadata.path
                .map((x: any) => x?.path)
                .filter((x: any) => !!x)
                .join("/"), [])
        }

        return encodeUri
            ? serialize(x, y, { ...z, allowJsonForComplexTypes: true }).map(encodeURIComponent)
            : serialize(x, y, { ...z, allowJsonForComplexTypes: true })
    }

    return (x: any) => {

        const fn = functions.find(fn => {
            const argNames = ((x && Object.keys(x)) || [])
            const fnParams = fn.params.filter(x => !x.isBindingParameter)

            for (let i = 0; i < fnParams.length; i++) {
                if (fnParams[i].isBindingParameter) continue

                const ix = argNames.indexOf(fnParams[i].name)
                if (ix === -1) return false

                argNames.splice(ix, 1)
            }

            return argNames.length === 0
        })

        if (!fn) {
            throw new Error(`Unknown function args for function ${functionName}(${(x && Object.keys(x)) || ""})`);
        }

        const [xs, atParamTypes] = Writer
            .traverse(fn.params
                .filter(x => !x.isBindingParameter)
                .map(param => _serialize(x[param.name], param.type, serializerSettings)
                    .map(x => `${param.name}=${x}`)), [])
            .execute()

        return {
            propertyName: `${functionName}(${xs.join(",")})`,
            outputType: fn.returnType,
            qbEmit: QbEmit.maybeZero(atParamTypes)
        }
    }
}

function buildFunctions(groupedFunctions: { [k: string]: ODataFunction[] }, serializerSettings: SerializerSettings, encodeUri: boolean): [string, (x: any) => SubPathSelection<any>][] {

    return Object
        .keys(groupedFunctions)
        .map(key => [
            key,
            functionUriBuilder(key, serializerSettings, groupedFunctions[key], encodeUri)
        ])
}

function listAllEntityFunctionsGrouped(
    type: ODataComplexType,
    serializerSettings: SerializerSettings,
    encodeUri: boolean,
    includeParent = true) {

    const groupedFunctions = groupFunctions(listAllEntityFunctionsUngrouped(type, serializerSettings.serviceConfig, includeParent))
    return buildFunctions(groupedFunctions, serializerSettings, encodeUri)
}

function listUnboundFunctionsGrouped(
    root: Dict<ODataSchema>,
    serializerSettings: SerializerSettings,
    schemaName: string,
    containerName: string,
    encodeUri: boolean) {

    const groupedFunctions = groupFunctions(root[schemaName].entityContainers[containerName].unboundFunctions)
    return buildFunctions(groupedFunctions, serializerSettings, encodeUri)
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
    serializerSettings: SerializerSettings,
    encodeUri: boolean) {

    const groupedFunctions = groupFunctions(entitySet.collectionFunctions)
    return buildFunctions(groupedFunctions, serializerSettings, encodeUri)
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
    outputType?: ODataTypeRef,
    qbEmit: QbEmit
}

export function isSubPathSelection<T>(x: any): x is SubPathSelection<IEntitySet<any, T, any, any, any, any, any, any>> {
    const keys = Object.keys(x)
    return !!keys.length
        && keys.indexOf("propertyName") !== -1
        && keys.indexOf("outputType") !== -1
        && typeof x["propertyName"] === "string"
        && typeof x["outputType"] === "object"
}

export function recontextDataForSubPath<TRoot, TFetchResult, TResult, TSubPath, TNewEntityQuery>(
    data: RequestBuilderData<TFetchResult, TResult>,
    subPath: (pathSelector: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): Writer<EntityQueryState, QbEmit> {

    return data.state
        .bind(state => {
            if (state.query.query.length) {
                throw new Error("You cannot add query components before navigating a sub path");
            }

            let propType: ODataTypeRef | null = null
            const paramsBuilder = params<TRoot>(data.tools.requestTools.uriRoot,
                data.tools.root, data.tools.serializerSettings, data.tools.schema);

            const newT = subPath(buildSubPathProperties(data, state.type, true), paramsBuilder)
            if (newT === $value) {
                propType = state.type
            } else if (newT === $count && state.type.isCollection) {
                propType = state.type.collectionType
            } else if (newT.outputType) {
                propType = newT.outputType
            } else if (!state.type.isCollection) {
                propType = tryFindPropertyType(state.type, newT.propertyName, data.tools.root.schemaNamespaces)
            }

            if (!propType) {
                throw new Error(`Invalid property ${newT.propertyName}`);
            }

            const propName = newT === $value
                ? "$value"
                : newT === $count
                    ? "$count"
                    : newT.propertyName

            const path = state.path?.length
                ? [...state.path, propName]
                : [propName];

            const qbEmit = newT.qbEmit instanceof QbEmit ? newT.qbEmit : QbEmit.zero
            return Writer.create(
                {
                    ...state,
                    path,
                    type: propType,
                    accept: newT === $value
                        ? Accept.Raw
                        : newT === $count
                            ? Accept.Integer
                            : state.accept,
                }
                , qbEmit)
        })
}

export type UnboundFunctionSetTools<TFetchResult, TResult> = {
    root: ODataServiceConfig
    serializerSettings: SerializerSettings
    schemaName: string
    containerName: string
    requestTools: RequestTools<TFetchResult, TResult>
    defaultResponseInterceptor: DefaultResponseInterceptor<TFetchResult, TResult>
}

export function recontextDataForUnboundFunctions<TRoot, TFetchResult, TResult, TSubPath, TNewEntityQuery>(
    data: UnboundFunctionSetTools<TFetchResult, TResult>,
    subPath: (pathSelector: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): Writer<EntityQueryState, QbEmit> {

    const paramsBuilder = params<TRoot>(data.requestTools.uriRoot,
        data.root, data.serializerSettings, data.root.schemaNamespaces[data.schemaName]);

    const functions = listUnboundFunctionsGrouped(data.root.schemaNamespaces, data.serializerSettings, data.schemaName, data.containerName, true)
        .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any)
    const newT = subPath(functions, paramsBuilder)
    if (!newT.outputType) {
        throw new Error(`Invalid property ${newT.propertyName}`);
    }

    return Writer.create({
        path: [newT.propertyName],
        accept: defaultAccept,
        type: newT.outputType,
        query: {
            query: [],
            urlEncode: true
        }
    }, newT.qbEmit)
}