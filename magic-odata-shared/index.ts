// TYPE REFS
export type ODataTypeName = {
    name: string,
    namespace: string
}

export type ODataCollectionTypeRef = {
    isCollection: true,
    collectionType: ODataTypeRef
}

export type ODataSingleTypeRef = ODataTypeName & {
    isCollection: false
}

export type ODataTypeRef = ODataCollectionTypeRef | ODataSingleTypeRef

// FUNCTIONS
export type FunctionParam = {
    isBindingParameter: boolean
    name: string
    type: ODataTypeRef
}

export type Function = {
    namespace: string
    name: string
    params: FunctionParam[]
    returnType: ODataTypeRef
}

// ENUMS
export type ODataEnum = ODataTypeName & {
    members: { [key: string]: number }
}

// COMPLEX TYPES
export type ODataComplexTypeProperty = {
    nullable: boolean
    navigationProperty: boolean
    type: ODataTypeRef
}

export type ODataComplexType = ODataTypeName & {
    keyProps?: string[] | undefined
    baseType?: ODataTypeName
    functions: Function[]
    properties: {
        [key: string]: ODataComplexTypeProperty
    }
}

export type TypeContainer<TCT extends string, T> = {
    containerType: TCT,
    type: T
}

// TODO: can this be expanded to primitives?
export type ComplexTypeOrEnum = TypeContainer<"ComplexType", ODataComplexType> | TypeContainer<"Enum", ODataEnum>

// AGGREGATED CONFIG
export type Dict<T> = { [k: string]: T }

export type ODataEntitySet = {
    isSingleton: boolean
    name: string,
    /** The schema namespace */
    namespace: string,
    /** The entity set namespace */
    containerName: string,
    forType: ODataSingleTypeRef
    collectionFunctions: Function[]
}

export type EntityContainer = {
    entitySets: Dict<ODataEntitySet>
}

export type ODataSchema = {
    types: Dict<ComplexTypeOrEnum>
    entityContainers: Dict<EntityContainer>
}

export type ODataServiceConfig = {
    schemaNamespaces: Dict<ODataSchema>
}








// // TYPE COLLECTIONS
// export type ODataServiceTypes = {
//     [namespace: string]: {
//         [typeName: string]: ComplexTypeOrEnum
//     }
// }

// export type ODataEntitySetNamespaces = {
//     [key: string]: ODataEntitySets
// }

// export type ODataEntitySets = {
//     [key: string]: ODataEntitySet
// }