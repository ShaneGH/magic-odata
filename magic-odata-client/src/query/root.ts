import { Dict, EntityContainer, ODataEntitySet, ODataServiceConfig } from "magic-odata-shared";
import { EntitySet, IEntitySet } from "../entitySet.js";
import { EntitySetTools } from "../entitySet/utils.js";
import { FilterEnv, FilterResult } from "../queryBuilder.js";
import { Reader } from "../utils.js";

type ESet = EntitySet<any, any, any, any, any, any, any, any>

export type RootQuery<TRoot> = (filter: TRoot) => IEntitySet<any, any, any, any, any, any, any, any>

export function $root(filter: (root: any) => IEntitySet<any, any, any, any, any, any, any, any>) {

    return Reader.create<FilterEnv, FilterResult>(env => {

        const entitySetTree = Object
            .keys(env.schema.entityContainers)
            .map(ns => methodsForEntitySetNamespace(
                env.serviceConfig,
                ns.replace(/[^a-zA-Z0-9$._]/g, ".").split("."),
                env.schema.entityContainers[ns].entitySets))
            .reduce((s, x) => {
                if (!s) return x
                return merge(s, x, "root")
            }, null as Node | null);

        const entitySets = (entitySetTree && stripSumType(entitySetTree)) || {}
        const entitySet = filter(entitySets)
        return {
            $$output: entitySet.getOutputType(),
            $$filter: env.buildUri(entitySet.uri(false))
        }
    });
}

function stripSumType(leaf: Node): FinalNamespace<ESet> | ESet {
    if (leaf.t === "EntitySet") {
        return leaf.data
    }

    return Object
        .keys(leaf.data)
        .reduce((s, x) => ({
            ...s,
            [x]: stripSumType(leaf.data[x])
        }), {} as FinalNamespace<ESet>)
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
            if (s.leaf.t === "EntitySet") {
                // be careful here. s must always be a "Namespace"
                // and the type checker will not ensure that
                throw new Error("Unexpected error");
            }

            const existsIn2 = s.remaining2.indexOf(x)
            const leaf: Node = {
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
            leaf: { t: "Namespace", data: {} } as Node,
            remaining2: Object.keys(part2.data)
        })

    return remaining2
        .reduce((s, x) => merge(s, part2.data[x], x), leaf)
}

type FinalNamespace<T> = { [k: string]: T | FinalNamespace<T> }

type Namespace = { [k: string]: Node }

type Node =
    | { t: "EntitySet", data: ESet }
    | { t: "Namespace", data: Namespace }

function methodsForEntitySetNamespace(
    serviceConfig: ODataServiceConfig,
    entitySetNamespaceParts: string[],
    entitySets: Dict<ODataEntitySet>): Node {

    if (!entitySetNamespaceParts.length) {
        return Object
            .keys(entitySets)
            // TODO: getters instead of eager creation
            .reduce((s, key) => {
                if (s.t === "EntitySet") {
                    // be careful here. s must always be a "Namespace"
                    // and the type checker will not ensure that
                    throw new Error("Unexpected error");
                }

                const tools: EntitySetTools<any, any> = {
                    requestTools: {
                        request() { throw new Error("This entity set has http requests disabled") },
                        uriRoot: "$root/"
                    },
                    defaultResponseInterceptor: () => { throw new Error("This entity set has http requests disabled") },
                    type: entitySets[key].isSingleton
                        ? entitySets[key].forType
                        : { isCollection: true, collectionType: entitySets[key].forType },
                    entitySet: entitySets[key],
                    root: serviceConfig
                }

                return {
                    t: "Namespace",
                    data: {
                        ...s.data,
                        [key]: {
                            t: "EntitySet",
                            data: new EntitySet<any, any, any, any, any, any, any, any>(tools, undefined, true)
                        }
                    }
                }
            }, { t: "Namespace", data: {} } as Node)
    }

    return {
        t: "Namespace",
        data: {
            [entitySetNamespaceParts[0]]: methodsForEntitySetNamespace(serviceConfig, entitySetNamespaceParts.slice(1), entitySets)
        }
    }
}
