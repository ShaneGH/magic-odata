import { Dict, ODataEntitySet, ODataSchema, ODataServiceConfig, ODataTypeRef, Function as ODataFunction, EntityContainer } from "magic-odata-shared";
import { RequestBuilder } from "../requestBuilder.js";
import { SchemaTools } from "../entitySet/utils.js";
import { IUriBuilder, Params } from "../entitySetInterfaces.js";
import { Filter, QbEmit } from "../queryBuilder.js";
import { Writer } from "../utils.js";
import { AtParam, SerializerSettings, rawType } from "../valueSerializer.js";
import { UnboundFunctionSet } from "../unboundFunctionSet.js";
import { SubPathSelection } from "../entitySet/subPath.js";
import { ODataUriParts } from "../entitySet/requestTools.js";

type RBuilder = RequestBuilder<any, any, any, any, any, any, any, any>

export type RootQuery<TRoot> = (filter: TRoot) => IUriBuilder

// TODO: this (+ deps) should not really be in $root anymore. It is used by a few different things
export function buildUriBuilderRoot(uriRoot: string, serializerSettings: SerializerSettings, serviceConfig: ODataServiceConfig, schema: ODataSchema) {

    const entitySetTree = Object
        .keys(schema.entityContainers)
        .map(ns => methodsForEntitySetNamespace(
            ns,
            uriRoot,
            serviceConfig,
            serializerSettings,
            schema,
            ns.replace(/[^a-zA-Z0-9$._]/g, ".").split("."),
            schema.entityContainers[ns]))
        .reduce((s, x) => {
            if (!s) return x
            return merge(s, x, "root")
        }, null as Node | null);

    return (entitySetTree && stripSumType(entitySetTree)) || {} as any
}

export function extractAtParams(uriParts: ODataUriParts) {

    const { query, at } = Object
        .keys(uriParts.query)
        .reduce(
            (s, x) => x.length > 0 && x[0] === "@"
                ? {
                    ...s,
                    at: [
                        ...s.at,
                        new AtParam({
                            type: "Const",
                            data: { name: x, value: uriParts.query[x], paramType: rawType }
                        })]
                }
                : { ...s, query: { ...s.query, [x]: uriParts.query[x] } },
            { query: {} as Dict<string>, at: [] as AtParam[] })

    return Writer.create<ODataUriParts, QbEmit>(
        { ...uriParts, query },
        QbEmit.maybeZero(undefined, at))
}

export function $root(filter: (root: any) => IUriBuilder) {

    return Filter.create(env => {

        const entitySets = buildUriBuilderRoot("$root/", env.serializerSettings, env.serviceConfig, env.schema)
        const { uriParts, qbEmit, outputType } = filter(entitySets).uriWithMetadata(false)

        return [
            {
                $$output: outputType,
                $$filter: env.buildUri(
                    extractAtParams(uriParts).execute()[0])
            },
            qbEmit]
    });
}

// eslint-disable-next-line @typescript-eslint/ban-types
function stripSumType(leaf: Node): FinalNamespace<RBuilder | Function> | RBuilder | Function {
    if (leaf.t === "EntitySet") {
        return leaf.data
    }

    return Object
        .keys(leaf.data)
        .reduce((s, x) => ({
            ...s,
            [x]: stripSumType(leaf.data[x])
            // eslint-disable-next-line @typescript-eslint/ban-types
        }), {} as FinalNamespace<RBuilder | Function>)
}

function merge(part1: Node, part2: Node, name: string): Node {

    if (part1.t === "EntitySet") {
        if (part2.t === "EntitySet") {
            console.warn(`Found clash of entity set names ${name}`);
        } else {
            console.warn(`Found clash of entity set with namespace ${name}`);
        }

        return part1
    }

    if (part2.t === "EntitySet") {
        console.warn(`Found clash of entity set with namespace ${name}`);
        return part2
    }

    const { leaf, remaining2 } = Object
        .keys(part1.data)
        .reduce((s, x) => {

            const existsIn2 = s.remaining2.indexOf(x)
            const leaf: NsNode = {
                t: "Namespace",
                data: {
                    ...s.leaf.data,
                    [x]: existsIn2 === -1
                        ? part1.data[x]
                        : merge(part1.data[x], part2.data[x], x)
                }
            }

            const remaining2 = existsIn2 === -1
                ? s.remaining2
                : [
                    ...s.remaining2.slice(0, existsIn2),
                    ...s.remaining2.slice(existsIn2 + 1)
                ]

            return {
                leaf,
                remaining2
            }
        }, {
            leaf: { t: "Namespace", data: {} } as NsNode,
            remaining2: Object.keys(part2.data)
        })

    return remaining2
        .reduce((s, x) => ({
            ...s,
            data: {
                ...s.data,
                [x]: part2.data[x]
            }
        }), leaf)
}

type FinalNamespace<T> = { [k: string]: T | FinalNamespace<T> }

type Namespace = { [k: string]: Node }

type NsNode = { t: "Namespace", data: Namespace }

type Node =
    // eslint-disable-next-line @typescript-eslint/ban-types
    | { t: "EntitySet", data: RBuilder | Function } // Function is for unboundFunctions
    | NsNode

function methodsForEntitySetNamespace(
    containerName: string,
    uriRoot: string,
    serviceConfig: ODataServiceConfig,
    serializerSettings: SerializerSettings,
    schema: ODataSchema,
    entitySetNamespaceParts: string[],
    container: EntityContainer): Node {

    if (!entitySetNamespaceParts.length) {
        return merge(
            entitySetsForEntitySetNamespace(uriRoot, serviceConfig, serializerSettings, schema, container.entitySets),
            functionsForEntitySetNamespace(uriRoot, serviceConfig, serializerSettings, containerName, schema, container.unboundFunctions),
            containerName)
    }

    return {
        t: "Namespace",
        data: {
            [entitySetNamespaceParts[0]]: methodsForEntitySetNamespace(containerName, uriRoot, serviceConfig, serializerSettings, schema, entitySetNamespaceParts.slice(1), container)
        }
    }
}

function requestTools(uriRoot: string) {
    return {
        request() { throw new Error("This entity set has http requests disabled") },
        uriRoot: uriRoot
    }
}

function entitySetsForEntitySetNamespace(
    uriRoot: string,
    serviceConfig: ODataServiceConfig,
    serializerSettings: SerializerSettings,
    schema: ODataSchema,
    entitySets: Dict<ODataEntitySet>): Node {

    return Object
        .keys(entitySets)
        .reduce((s, key) => {
            if (s.t === "EntitySet") {
                // be careful here. s must always be a "Namespace"
                // and the type checker will not ensure that
                throw new Error("Unexpected error");
            }

            const type: ODataTypeRef = entitySets[key].isSingleton
                ? entitySets[key].forType
                : { isCollection: true, collectionType: entitySets[key].forType }

            const tools: SchemaTools<any, any> = {
                requestTools: requestTools(uriRoot),
                defaultResponseInterceptor: () => { throw new Error("This entity set has http requests disabled") },
                serializerSettings,
                schema,
                root: serviceConfig
            }

            return {
                t: "Namespace",
                data: {
                    ...s.data,
                    [key]: {
                        t: "EntitySet",
                        data: new RequestBuilder<any, any, any, any, any, any, any, any>(tools, entitySets[key], type, undefined, true)
                    }
                }
            }
        }, { t: "Namespace", data: {} } as Node)
}

function functionsForEntitySetNamespace(
    uriRoot: string,
    serviceConfig: ODataServiceConfig,
    serializerSettings: SerializerSettings,
    containerName: string,
    schema: ODataSchema,
    functions: ODataFunction[]): Node {

    if (!functions.length) {
        return {
            t: "Namespace",
            data: {}
        }
    }

    let fns: UnboundFunctionSet<any, any, any> | null = null;
    return {
        t: "Namespace",
        data: {
            unboundFunctions: {
                t: "EntitySet",
                data: (f: (functions: Dict<(x: any) => SubPathSelection<any>>, params: Params<any>) => any) => {

                    fns ||= new UnboundFunctionSet<any, any, any>({
                        root: serviceConfig,
                        serializerSettings,
                        schema,
                        containerName,
                        requestTools: requestTools(uriRoot),
                        defaultResponseInterceptor: () => { throw new Error("This entity set has http requests disabled") },
                    }, true)

                    return fns.subPath(f)
                }
            }
        }
    }
}
