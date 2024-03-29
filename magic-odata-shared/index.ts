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
    isNullable: boolean
    name: string
    type: ODataTypeRef
}

export type Function = {
    namespace: string
    name: string
    params: FunctionParam[]
    returnType: ODataTypeRef
    returnTypeNullable: boolean
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
    // eslint-disable-next-line @typescript-eslint/ban-types
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
    // eslint-disable-next-line @typescript-eslint/ban-types
    collectionFunctions: Function[]
}

export type EntityContainer = {
    entitySets: Dict<ODataEntitySet>
    // eslint-disable-next-line @typescript-eslint/ban-types
    unboundFunctions: Function[]
}

export type ODataSchema = {
    types: Dict<ComplexTypeOrEnum>
    entityContainers: Dict<EntityContainer>
}

export type ODataServiceConfig = {
    schemaNamespaces: Dict<ODataSchema>
}