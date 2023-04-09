import {
    ComplexTypeOrEnum, EntityContainer, ODataEntitySet, ODataSchema,
    ODataServiceConfig, ODataTypeName, Function, ODataTypeRef, FunctionParam, ODataEnum, ODataComplexType, ODataComplexTypeProperty
} from "magic-odata-shared";
import { Dict, mapDict, removeDictNulls, removeNulls, Writer, zip } from "./utils.js";

type Visitors<TWriter extends { concat: (x: TWriter) => TWriter }> = { zero: TWriter } & Partial<{
    /** Used to visit type refs. Type refs will not be visited by visitSchemaNamespace */
    visitTypeName: (typeName: ODataTypeName) => Writer<ODataTypeName, TWriter> | undefined,

    /** Used to visit function namespaces and entity set namespaces */
    visitSchemaNamespace: (schemaNamespace: string) => Writer<string, TWriter> | undefined,

    /** Used to visit container names */
    visitContainerName: (schemaNamespace: string, containerName: string) => Writer<string, TWriter> | undefined
}>

export function traverseWriterDict<T, TWriter extends { concat: (x: TWriter) => TWriter }>(
    items: Dict<Writer<T, TWriter>>, zero: TWriter): Writer<Dict<T>, TWriter> {

    return Object
        .keys(items)
        .reduce(
            (s, k) => s.bind(dict => [({ ...dict, [k]: items[k].execute()[0] }), items[k].execute()[1]]),
            Writer.create({}, zero) as Writer<Dict<T>, TWriter>)
}

export function traverseWriter<T, TWriter extends { concat: (x: TWriter) => TWriter }>(
    items: Writer<T, TWriter>[], zero: TWriter): Writer<T[], TWriter> {

    return items
        .reduce(
            (s, x) => s.bind(list => [[...list, x.execute()[0]], x.execute()[1]]),
            Writer.create([], zero) as Writer<T[], TWriter>)
}

/** Drops keys or values mapped to undefined */
export function mapWriterDict<T, T1, TWriter extends { concat: (x: TWriter) => TWriter }>(
    items: Dict<T>,
    zero: TWriter,
    mapper: (x: T, oldKey: string, newKey: string) => (Writer<T1, TWriter> | undefined),
    keyMapper?: (x: string) => (Writer<string, TWriter> | undefined)): Writer<Dict<T1>, TWriter> {

    return Object
        .keys(items)
        .reduce((s, x) => s
            .bind(dict => (keyMapper ? keyMapper(x) : Writer.create(x, zero))
                ?.bind(newK => mapper(items[x], x, newK)
                    ?.map(newV => ({
                        ...dict,
                        [newK]: newV
                    })) || s
                ) || s), Writer.create<Dict<T1>, TWriter>({}, zero))
}

export function visit<TWriter extends { concat: (x: TWriter) => TWriter }>(config: ODataServiceConfig, visitors: Visitors<TWriter>): Writer<ODataServiceConfig, TWriter> {

    const zero = visitors.zero
    return mapWriterDict(config.schemaNamespaces, zero, visitSchema, visitors.visitSchemaNamespace)
        .map(removeDictNulls)
        .map(schemaNamespaces => ({ schemaNamespaces }))

    function id<T>(x: T) { return Writer.create(x, zero) }
    function snd<T, U>(x: T, y: U) { return Writer.create(y, zero) }

    function visitType(type: ComplexTypeOrEnum): Writer<ComplexTypeOrEnum, TWriter> | undefined {

        return type.containerType === "Enum"
            ? visitEnumType(type.type)?.map(enumType => enumType === type.type ? type : {
                containerType: "Enum",
                type: enumType
            })
            : visitComplexType(type.type)?.map(complexType => complexType === type.type ? type : {
                containerType: "ComplexType",
                type: complexType
            })
    }

    function visitComplexTypeProperty(prop: ODataComplexTypeProperty): Writer<ODataComplexTypeProperty, TWriter> | undefined {
        return visitODataTypeRef(prop.type)
            ?.map(type => type === prop.type
                ? prop
                : {
                    type,
                    nullable: prop.nullable,
                    navigationProperty: prop.navigationProperty
                })
    }

    function visitComplexType(type: ODataComplexType): Writer<ODataComplexType, TWriter> | undefined {

        const typeName = (visitors.visitTypeName || id)(type);
        if (!typeName) return undefined

        const baseType = type.baseType
            ? (visitors.visitTypeName || id)(type.baseType) as Writer<ODataTypeName | undefined, TWriter>
            : Writer.create<ODataTypeName | undefined, TWriter>(undefined, zero);
        if (!baseType) return undefined

        const functions = removeNulls(type.functions.map(visitFunction))

        const properties = removeDictNulls(mapDict(type.properties, visitComplexTypeProperty));

        return traverseWriterDict(properties, zero)
            .apply(traverseWriter(functions, zero)
                .apply(baseType
                    .apply(typeName
                        .apply(Writer.create(mapOutput, zero)))))
            .map(f => f())

        // eslint-disable-next-line @typescript-eslint/ban-types
        function mapOutput(typeName: ODataTypeName, baseType: ODataTypeName | undefined, functions: Function[], properties: Dict<ODataComplexTypeProperty>): ODataComplexType {
            return {
                name: typeName.name,
                namespace: typeName.namespace,
                keyProps: type.keyProps,
                baseType: baseType,
                functions: functions,
                properties: properties,
            }
        }
    }

    function visitEnumType(type: ODataEnum): Writer<ODataEnum, TWriter> | undefined {

        return (visitors.visitTypeName || id)(type)?.map(visited => {
            if (visited === type) return type

            return {
                name: visited.name,
                namespace: visited.namespace,
                members: type.members
            }
        })
    }

    function visitODataTypeRef(t: ODataTypeRef): Writer<ODataTypeRef, TWriter> | undefined {
        if (!visitors.visitTypeName) return Writer.create(t, zero)

        if (t.isCollection) {
            return visitODataTypeRef(t.collectionType)
                ?.map(collectionType => ({ isCollection: true, collectionType }))
        }

        return visitors
            .visitTypeName(t)
            ?.map(x => x === t ? t : { isCollection: false, namespace: x.namespace, name: x.name })
    }

    function visitFunctionParam(param: FunctionParam): Writer<FunctionParam, TWriter> | undefined {

        return visitODataTypeRef(param.type)
            ?.map(type => type === param.type
                ? param
                : {
                    isBindingParameter: param.isBindingParameter,
                    name: param.name,
                    isNullable: param.isNullable,
                    type
                })
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    function visitFunction(f: Function): Writer<Function, TWriter> | undefined {

        const namespace = (visitors.visitSchemaNamespace || id)(f.namespace)
        if (namespace == null) return undefined

        const returnType = visitODataTypeRef(f.returnType)
        if (returnType == null) return undefined

        const params = removeNulls(f.params.map(visitFunctionParam))
        if (params.length !== f.params.length) return undefined

        return traverseWriter(params, zero)
            .apply(returnType
                .apply(namespace
                    .apply(Writer.create(mapOutput, zero))))
            .map(f => f())


        // eslint-disable-next-line @typescript-eslint/ban-types
        function mapOutput(namespace: string, returnType: ODataTypeRef, params: FunctionParam[]): Function {
            if (namespace === f.namespace
                && returnType === f.returnType
                && !arrayDiff(params, f.params)) {

                return f
            }

            return {
                namespace,
                name: f.name,
                returnTypeNullable: f.returnTypeNullable,
                params,
                returnType
            }
        }
    }

    function arrayDiff<T>(xs: T[], ys: T[]) {
        return !!zip(xs, ys).filter(([x, y]) => x !== y).length
    }

    function visitEntitySet(entitySet: ODataEntitySet): Writer<ODataEntitySet, TWriter> | undefined {

        const container = (visitors.visitContainerName || snd)(entitySet.namespace, entitySet.containerName)
        if (container == null) return undefined

        const namespace = (visitors.visitSchemaNamespace || id)(entitySet.namespace)
        if (namespace == null) return undefined

        const forType = (visitors.visitTypeName || id)(entitySet.forType)
        if (forType == null) return undefined

        const collectionFunctions = removeNulls(entitySet.collectionFunctions.map(visitFunction))

        return traverseWriter(collectionFunctions, zero)
            .apply(forType
                .apply(namespace
                    .apply(container
                        .apply(Writer.create(mapOutuput, zero)))))
            .map(f => f())

        // eslint-disable-next-line @typescript-eslint/ban-types
        function mapOutuput(containerName: string, namespace: string, forType: ODataTypeName, collectionFunctions: Function[]): ODataEntitySet {

            if (containerName === entitySet.containerName
                && namespace === entitySet.namespace
                && !arrayDiff(collectionFunctions, entitySet.collectionFunctions)
                && forType === entitySet.forType) {

                return entitySet
            }

            return {
                isSingleton: entitySet.isSingleton,
                name: entitySet.name,
                namespace,
                containerName,
                forType: {
                    isCollection: false,
                    namespace: forType.namespace,
                    name: forType.name
                },
                collectionFunctions
            }
        }
    }

    function visitEntityContainer(container: EntityContainer): Writer<EntityContainer, TWriter> | undefined {

        const entitySets = removeDictNulls(
            mapDict(container.entitySets, visitEntitySet))

        const unboundFunctions = removeNulls(container.unboundFunctions
            .map(visitFunction))

        if (!Object.keys(entitySets).length && !unboundFunctions.length)
            return undefined

        return traverseWriter(unboundFunctions, zero)
            .apply(traverseWriterDict(entitySets, zero)
                .apply(Writer.create(mapOutput, zero)))
            .map(f => f());

        // eslint-disable-next-line @typescript-eslint/ban-types
        function mapOutput(entitySets: Dict<ODataEntitySet>, unboundFunctions: Function[]): EntityContainer {

            return {
                entitySets,
                unboundFunctions
            }
        }
    }

    function visitSchema(schema: ODataSchema, schemaNamespace: string): Writer<ODataSchema, TWriter> | undefined {

        const types = removeDictNulls(
            mapDict(schema.types, visitType))

        const visitKeys = visitors.visitContainerName

        const entityContainers = mapWriterDict(
            schema.entityContainers, zero,
            visitEntityContainer,
            visitKeys && (n => visitKeys(schemaNamespace, n)))

        if (Object.keys(types).length === 0 && Object.keys(entityContainers).length === 0)
            return undefined

        return entityContainers
            .apply(traverseWriterDict(types, zero)
                .apply(Writer.create(mapOutput, zero)))
            .map(f => f())

        function mapOutput(types: Dict<ComplexTypeOrEnum>, entityContainers: Dict<EntityContainer>): ODataSchema {

            return {
                types,
                entityContainers
            }
        }
    }
}