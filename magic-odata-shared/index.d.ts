

export type ODataTypeName = {
    name: string,
    namespace: string
}

export type ODataComplexTypeProperty = {
    nullable: boolean
    navigationProperty: boolean
    type: ODataTypeRef
}

export type ODataComplexType = ODataTypeName & {
    keyProps?: string[] | undefined
    baseType?: ODataTypeName
    properties: {
        [key: string]: ODataComplexTypeProperty
    }
}

export type ODataSingleTypeRef = ODataTypeName & {
    isCollection: false
}

export type ODataCollectionTypeRef = {
    isCollection: true,
    collectionType: ODataTypeRef
}

export type ODataTypeRef = ODataCollectionTypeRef | ODataSingleTypeRef

export type TypeContainer<TCT extends string, T> = {
    containerType: TCT,
    type: T
}

// TODO: can I expand this to primitives?
export type ComplexTypeOrEnum = TypeContainer<"ComplexType", ODataComplexType> | TypeContainer<"Enum", ODataEnum>

export type ODataServiceTypes = {
    [namespace: string]: {
        [typeName: string]: ComplexTypeOrEnum
    }
}

export type ODataEnum = ODataTypeName & {
    members: { [key: string]: number }
}

export type ODataServiceConfig = {
    entitySets: ODataEntitySetNamespaces
    types: ODataServiceTypes
}

export type ODataEntitySet = {
    isSingleton: boolean
    name: string,
    namespace: string,
    forType: ODataSingleTypeRef
}

export type ODataEntitySetNamespaces = {
    [key: string]: ODataEntitySets
}

export type ODataEntitySets = {
    [key: string]: ODataEntitySet
}