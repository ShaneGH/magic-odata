
export {
    ODataServiceConfig,
    ODataComplexType,
    ODataTypeRef,
    ODataEntitySet,
    ODataSchema,
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
    ThisEntitySetCannotQuery
} from "./src/query/filters.js"

export {
    Utils as QueryUtils,
    utils as queryUtils
} from "./src/query/queryUtils.js"

export {
    Query,
    buildQuery
} from "./src/queryBuilder.js"

export {
    RequestBuilder
} from "./src/requestBuilder.js"

export {
    UnboundFunctionSet
} from "./src/unboundFunctionSet.js"

export {
    ODataCollectionResult,
    ODataResult,
    Params,
    RefType,
    IEntitySet
} from "./src/entitySetInterfaces.js"

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
    DefaultResponseInterceptor,
    ResponseInterceptor,
    RootResponseInterceptor
} from "./src/entitySet/requestTools.js"

export {
    QueryObjectType,
    QueryPrimitive,
    QueryEnum,
    QueryCollection,
    QueryComplexObject,
    QueryObject
} from "./src/query/queryComplexObjectBuilder.js"

export {
    ODataDate,
    ODataTimeOfDay,
    ODataDuration,
    ODataOffset,
    ODataDateTimeOffset,
    EdmDate,
    EdmTimeOfDay,
    EdmDuration,
    EdmDateTimeOffset
} from "./src/edmTypes.js"

export {
    SingleItemsCannotBeQueriedByKey,
    CastingOnCollectionsOfCollectionsIsNotSupported,
    CastingOnEnumsAndPrimitivesIsNotSupported,
    QueryingOnCollectionsOfCollectionsIsNotSupported,
    QueryingOnUnboundFunctionsIsNotSupported,
    CastingOnUnboundFunctionsIsNotSupported,
    ThisItemDoesNotHaveAKey,
    $ValueAnd$CountTypesCanNotBeOperatedOn,
    PrimitiveSubPath,
    CollectionSubPath,
    EntitySetSubPath,
    SerializerSettings
} from "./src/exportedTypes.js"