
export {
    ODataServiceConfig,
    ODataComplexType,
    ODataTypeRef,
} from "magic-odata-shared"

export {
    FilterableProps,
    FilterablePaths
} from "./src/query/filtering/op1.js"

export {
    IntegerTypes,
    DecimalNumberTypes,
    RealNumberTypes,
    NonNumericTypes,
    OutputTypes
} from "./src/query/filtering/queryPrimitiveTypes0.js"

export {
    Utils as QueryUtils,
    utils as queryUtils
} from "./src/query/queryUtils.js"

export {
    Query,
    buildQuery
} from "./src/queryBuilder.js"

export {
    ODataCollectionResult,
    ODataResult,
    EntitySet,
    IEntitySet
} from "./src/entitySet.js"

export {
    HttpError
} from "./src/entitySet/executeRequest.js"

export {
    SubPathSelection
} from "./src/entitySet/subPath.js"

export {
    KeySelection,
    WithKeyType
} from "./src/entitySet/selectByKey.js"

export {
    CastSelection,
} from "./src/entitySet/cast.js"

export {
    RequestTools,
    RequestOptions,
    ODataUriParts,
    RootResponseInterceptor
} from "./src/entitySet/requestTools.js"

export {
    QueryObjectType,
    QueryPrimitive,
    QueryEnum,
    QueryCollection,
    QueryComplexObject,
    QueryObject,
    buildComplexTypeRef // https://github.com/ShaneGH/magic-odata/issues/6
} from "./src/typeRefBuilder.js"

/*
 * It is not possible to select an item by key more than once
 * If you encounter this type, it is a sign that you are doing somethnig incorrect
 * 
 * This is a type designed not to be used
 */
export type SingleItemsCannotBeQueriedByKey = never

/*
 * It is not possible to traverse or select a property of an item inside a collection
 * You must first apply a key to the collection, and then you can traverse the item
 * 
 * This is a type designed not to be used
 */
export type CollectionsCannotBeTraversed = never

/*
 * It is not possible to traverse or select a property of a primitive type, e.g. a string or an Int32
 * 
 * This is a type designed not to be used
 */
export type PrimitiveTypesCannotBeTraversed = never

/*
 * We are not sure if this is a valid use case. The odata spec is vague on the matter
 * Many OData server implementations do not support this
 * 
 * This is a type designed not to be used
 */
export type CastingOnCollectionsOfCollectionsIsNotSupported = never

/*
 * We are not sure if this is a valid use case. The odata spec is vague on the matter
 * Many OData server implementations do not support this
 * 
 * This is a type designed not to be used
 */
export type QueryingOnCollectionsOfCollectionsIsNotSupported = never

/*
 * The item you are attmpting to query does not have a key property
 * This might be because it is not an entity type, or becauese the OData service is misconfigured
 * 
 * This is a type designed not to be used
 */
export type ThisItemDoesNotHaveAKey = never