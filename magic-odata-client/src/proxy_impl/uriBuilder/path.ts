import { ODataSingleTypeRef, ODataTypeRef } from "magic-odata-shared"
import { ODataComplexType } from "../../../index.js"
import { Accept } from "../../entitySet/utils.js"
import { IntegerTypes, NonNumericTypes, resolveOutputType } from "../../query/filtering/queryPrimitiveTypes0.js"
import { ReaderState } from "../../utils.js"
import { Path } from "../uriEvents/uriPartStream.js"
import { mapKey } from "./keys.js"
import { appendPath, dir, entityName, expectCollection, expectProperty, MappingUtils, reWrapCollections, typeNameString, unwrapCollections, UriRoughwork } from "./utils.js"

const int64T = resolveOutputType(IntegerTypes.Int64)
const stringT = resolveOutputType(NonNumericTypes.String)

export function mapPath(x: Path, type: ODataTypeRef | null): ReaderState<MappingUtils, ODataTypeRef, UriRoughwork> {

    if (x.type === "EntitySetName") {
        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {
            const es = env.encodeURIComponent(x.data.name)
            const type: ODataTypeRef = x.data.isSingleton
                ? x.data.forType
                : { isCollection: true, collectionType: x.data.forType }

            return [
                type,
                {
                    ...s,
                    type,
                    oDataUriParts: {
                        ...s.oDataUriParts,
                        entitySetName: x.data.name,
                        relativePath: appendPath(s.oDataUriParts.relativePath, es)
                    }
                }]
        })
    }

    if (x.type === "$count" || x.type === "$value") {
        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {

            return [
                x.type === "$count" ? int64T : stringT,
                {
                    ...s,
                    accept: x.type === "$count" ? Accept.Integer : Accept.Raw,
                    oDataUriParts: {
                        ...s.oDataUriParts,
                        relativePath: appendPath(s.oDataUriParts.relativePath, x.type)
                    }
                }]
        })
    }

    if (x.type === "PropertyName") {
        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {

            type = expectType()
            if (type.isCollection) throw new Error(`Invalid type: ${entityName(type)}. Not expecting collection`) // TODO: possible to test this?

            const es = env.encodeURIComponent(x.data)
            const t = expectProperty(env.rootConfig.schemaNamespaces, type, x.data)

            return [
                t,
                {
                    ...s,
                    oDataUriParts: {
                        ...s.oDataUriParts,
                        relativePath: appendPath(s.oDataUriParts.relativePath, es)
                    }
                }]
        })
    }

    if (x.type === "Cast") {
        return ReaderState.create<MappingUtils, ODataTypeRef, UriRoughwork>((env, s) => {

            const unwrapped = unwrapCollections(expectType())
            const inherits = Object
                .keys(env.rootConfig.schemaNamespaces)
                .map(ns => Object
                    .keys(env.rootConfig.schemaNamespaces[ns].types)
                    .map(t => env.rootConfig.schemaNamespaces[ns].types[t]))
                .reduce((s, x) => [...s, ...x], [])
                .filter(x => x.containerType === "ComplexType"
                    && ((x.type.baseType
                        && x.type.baseType.namespace === unwrapped.type.namespace
                        && x.type.baseType.name === unwrapped.type.name)
                        || (x.type.namespace === unwrapped.type.namespace
                            && x.type.name === unwrapped.type.name)))
                .map(x => x.type as ODataComplexType)
                .map(type => ({
                    // https://github.com/ShaneGH/magic-odata/issues/5
                    keys: [type.name, `${type.namespace && `${type.namespace}/`}${type.name}`.replace(/[^\w]/g, "_")],
                    result: { isCollection: false, name: type.name, namespace: type.namespace } as ODataSingleTypeRef
                }))
                .find(t => t.keys.indexOf(x.data) !== -1);

            if (!inherits) {
                throw new Error(`Could not find type to cast: ${x.data}`)
            }

            const es = env.encodeURIComponent(typeNameString(inherits.result, "."))
            const t = reWrapCollections({ depth: unwrapped.depth, type: inherits.result })
            return [
                t,
                {
                    ...s,
                    type: t,
                    oDataUriParts: {
                        ...s.oDataUriParts,
                        relativePath: appendPath(s.oDataUriParts.relativePath, es)
                    }
                }]
        })
    }

    return mapKey(x.data, expectCollection(expectType()))

    function expectType() {

        if (!type) {
            // TODO: audit all nulls and errors
            throw new Error("Unexpected error, expecting query type");
        }

        return type
    }
}