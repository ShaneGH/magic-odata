import { ODataComplexType, ODataTypeRef, Function as ODataFunction, ODataEntitySet, Dict, ODataSchema, ODataServiceConfig, Function } from "magic-odata-shared";
import { Params } from "../entitySetInterfaces.js";
import { QbEmit } from "../queryBuilder.js";
import { Writer } from "../utils.js";
import { AtParam, serialize } from "../valueSerializer.js";
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
            ? listAllEntitySetFunctionsGrouped(data.entitySet, data.tools.root.schemaNamespaces, encodeUri)
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

    const functions = listAllEntityFunctionsGrouped(t.type, data.tools.root.schemaNamespaces, encodeUri)
        .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any);

    return {
        ...functions,
        ...props
    }
}

export function functionUriBuilder(functionName: string, root: Dict<ODataSchema>, functions: Function[], encodeUri: boolean): (x: any) => SubPathSelection<any> {

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
            ? serialize(x, y, z, true).map(encodeURIComponent)
            : serialize(x, y, z, true)
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
                .map(param => _serialize(x[param.name], param.type, root)
                    .map(x => `${param.name}=${x}`)), [])
            .execute()

        return {
            propertyName: `${functionName}(${xs.join(",")})`,
            outputType: fn.returnType,
            atParamTypes
        }
    }
}

function buildFunctions(groupedFunctions: { [k: string]: ODataFunction[] }, root: Dict<ODataSchema>, encodeUri: boolean): [string, (x: any) => SubPathSelection<any>][] {

    return Object
        .keys(groupedFunctions)
        .map(key => [
            key,
            functionUriBuilder(key, root, groupedFunctions[key], encodeUri)
        ])
}

function listAllEntityFunctionsGrouped(
    type: ODataComplexType,
    root: Dict<ODataSchema>,
    encodeUri: boolean,
    includeParent = true) {

    const groupedFunctions = groupFunctions(listAllEntityFunctionsUngrouped(type, root, includeParent))
    return buildFunctions(groupedFunctions, root, encodeUri)
}

function listUnboundFunctionsGrouped(
    root: Dict<ODataSchema>,
    schemaName: string,
    containerName: string,
    encodeUri: boolean) {

    const groupedFunctions = groupFunctions(root[schemaName].entityContainers[containerName].unboundFunctions)
    return buildFunctions(groupedFunctions, root, encodeUri)
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
    root: Dict<ODataSchema>,
    encodeUri: boolean) {

    const groupedFunctions = groupFunctions(entitySet.collectionFunctions)
    return buildFunctions(groupedFunctions, root, encodeUri)
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
    atParamTypes: [AtParam, ODataTypeRef][]
}

export function recontextDataForSubPath<TRoot, TFetchResult, TResult, TSubPath, TNewEntityQuery>(
    data: RequestBuilderData<TFetchResult, TResult>,
    subPath: (pathSelector: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): RequestBuilderData<TFetchResult, TResult> {

    const stateXYX = data.state
        .bind(state => {
            if (state.query.query.length) {
                throw new Error("You cannot add query components before navigating a sub path");
            }

            let propType: ODataTypeRef | null = null
            const [mutableParamDefinitions, paramsBuilder] = params<TRoot>(data.tools.requestTools.uriRoot,
                data.tools.root, data.tools.schema);

            const newT = subPath(buildSubPathProperties(data, data.tools.type, true), paramsBuilder)
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

            const path = state.path?.length
                ? [...state.path, propName]
                : [propName];

            const atParamTypes = newT.atParamTypes instanceof QbEmit ? newT.atParamTypes : QbEmit.zero
            return Writer.create([
                {
                    ...state,
                    path,
                    accept: newT === $value
                        ? Accept.Raw
                        : newT === $count
                            ? Accept.Integer
                            : state.accept,
                }, propType] as [EntityQueryState, ODataTypeRef]
                , atParamTypes.concat(QbEmit.maybeZero([mutableParamDefinitions])))
        })

    const propTypeXYX = stateXYX.execute()[0][1]

    return {
        tools: { ...data.tools, type: propTypeXYX },
        entitySet: data.entitySet,
        state: stateXYX.map(([x]) => x)
    }
}

export type UnboundFunctionSetTools<TFetchResult, TResult> = {
    root: ODataServiceConfig
    schemaName: string
    containerName: string
    requestTools: RequestTools<TFetchResult, TResult>
    defaultResponseInterceptor: DefaultResponseInterceptor<TFetchResult, TResult>
}

export function recontextDataForUnboundFunctions<TRoot, TFetchResult, TResult, TSubPath, TNewEntityQuery>(
    data: UnboundFunctionSetTools<TFetchResult, TResult>,
    subPath: (pathSelector: TSubPath, params: Params<TRoot>) => SubPathSelection<TNewEntityQuery>): RequestBuilderData<TFetchResult, TResult> {

    const [mutableParamDefinitions, paramsBuilder] = params<TRoot>(data.requestTools.uriRoot,
        data.root, data.root.schemaNamespaces[data.schemaName]);

    const functions = listUnboundFunctionsGrouped(data.root.schemaNamespaces, data.schemaName, data.containerName, true)
        .reduce((s, x) => ({ ...s, [x[0]]: x[1] }), {} as any)
    const newT = subPath(functions, paramsBuilder)
    if (!newT.outputType) {
        throw new Error(`Invalid property ${newT.propertyName}`);
    }

    return {
        tools: {
            requestTools: data.requestTools,
            defaultResponseInterceptor: data.defaultResponseInterceptor,
            type: newT.outputType,
            schema: data.root.schemaNamespaces[data.schemaName],
            root: data.root
        },
        entitySet: null,
        state: Writer.create({
            path: [newT.propertyName],
            accept: defaultAccept,
            query: {
                query: [],
                urlEncode: true
            }
        }, QbEmit.maybeZero([mutableParamDefinitions], newT.atParamTypes))
    }
}