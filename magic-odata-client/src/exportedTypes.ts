import { IEntitySet } from "./entitySetInterfaces.js"
import { SubPathSelection } from "./entitySet/subPath.js"


/*
 * It is not possible to select an item by key more than once
 * If you encounter this type, it is a sign that you are doing somethnig incorrect
 * 
 * This is a type designed not to be used
 */
export type SingleItemsCannotBeQueriedByKey = never

/*
 * We are not sure if this is a valid use case. The odata spec is vague on the matter
 * Many OData server implementations do not support this
 * 
 * This is a type designed not to be used
 */
export type CastingOnCollectionsOfCollectionsIsNotSupported = never

/*
 * This use case is not yet supported
 * https://github.com/ShaneGH/magic-odata/issues/38
 * 
 * This is a type designed not to be used
 */
export type CastingOnEnumsAndPrimitivesIsNotSupported = never

/*
 * We are not sure if this is a valid use case. The odata spec is vague on the matter
 * Many OData server implementations do not support this
 * 
 * This is a type designed not to be used
 */
export type QueryingOnCollectionsOfCollectionsIsNotSupported = never

/*
 * It is not possible to query a set of unbound functions
 * 
 * This is a type designed not to be used
 */
export type QueryingOnUnboundFunctionsIsNotSupported = never

/*
 * It is not possible to cast a set of unbound functions
 * 
 * This is a type designed not to be used
 */
export type CastingOnUnboundFunctionsIsNotSupported = never

/*
 * The item you are attmpting to query does not have a key property
 * This might be because it is not an entity type, or becauese the OData service is misconfigured
 * 
 * This is a type designed not to be used
 */
export type ThisItemDoesNotHaveAKey = never

/*
 * Once you specify a $value or a $count for something, you cannot cast or get it's sub path
 * 
 * This is a type designed not to be used
 */
export type $ValueAnd$CountTypesCanNotBeOperatedOn = never

export type PrimitiveSubPath<TRoot, TValueResult, TQueryable, TFetchResult> = {
  $value: SubPathSelection<IEntitySet<
      /* TRoot */        TRoot,
      /* TEntity */      string,
      /* TResult */      TValueResult,
      /* TKeyBuilder */  ThisItemDoesNotHaveAKey,
      /* TQueryable */   TQueryable,
      /* TCaster */      $ValueAnd$CountTypesCanNotBeOperatedOn,
      /* TSubPath */     $ValueAnd$CountTypesCanNotBeOperatedOn,
      /* TFetchResult */ TFetchResult>>
}

export type CollectionSubPath<TRoot, TCountResult, TQueryable, TFetchResult> = {
  $count: SubPathSelection<IEntitySet<
      /* TRoot */        TRoot,
      /* TEntity */      number,
      /* TResult */      TCountResult,
      /* TKeyBuilder */  ThisItemDoesNotHaveAKey,
      /* TQueryable */   TQueryable,
      /* TCaster */      $ValueAnd$CountTypesCanNotBeOperatedOn,
      /* TSubPath */     $ValueAnd$CountTypesCanNotBeOperatedOn,
      /* TFetchResult */ TFetchResult>>
}

export type EntitySetSubPath<TRoot, TCountResult, TFunctions, TQueryable, TFetchResult> = TFunctions & CollectionSubPath<TRoot, TCountResult, TQueryable, TFetchResult>