import { FilterablePaths, FilterableProps } from "../../query/filtering/op1.js"
import { OutputTypes, RealNumberTypes } from "../../query/filtering/queryPrimitiveTypes0.js"

export interface QueryUtils<TRootType> {
    $filter: {
        /**
         * Do a custom filter operation. If mixing this operation with other
         * filtering operations, it is best to include an output type so that values
         * can be serialized correctly
         * @param filter  A basic filter string
         * @param outputType  Add this parameter if you are using 
         * the output of this filter with some of the other built in filters:
         * e.g. eq(x.val1, op(x.val2, p => `${p} add 1`, OutputTypes.Int32)). 
         * e.g. lt(x.minAge, op(`age add 1`, OutputTypes.Int32)). 
         * This will help the filter utils to serialize data correctly.
         * @example op("bandLeader eq 'Ringo'")
         */
        filterRaw(filter: any, outputType?: OutputTypes): any;
    
        /**
         * Do a custom filter operation using the path of an item.
         * @param obj  The root object of this filter operation. 
         * The root object can be any object available to the query. 
         * It does not have to be the query root object
         * @param filter  A function to build the filter as a string. 
         * The input is a reference to the root object param
         * The filter should return an unencoded filter string
         * @param outputType  Add this parameter if you are using 
         * the output of this filter with some of the other built in filters:
         * e.g. lt(x.minAge, op({ age: x.age }, p => `${p.age} add 1`, OutputTypes.Int32)). 
         * This will help the filter utils to serialize data correctly.
         * @example op({ property: x.bandLeader }, p => `${p.bandLeader} eq 'Ringo'`)
         */
        filterRaw(obj: FilterableProps, filter: (paths: FilterablePaths) => string, outputType?: OutputTypes): any;
    
        /**
         * An OData "eq" operation
         * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
         * @example eq(x.bandLeader, "Ringo")
         */
        eq<T>(lhs: T, rhs: T, mapper?: (x: T) => string): boolean;
    
        /**
         * An OData "and" operation
         * @param conditions  The values from a previous filter
         * @example and(eq(x.bandMemberCount, 4)), group(eq(x.bandLeader, "Ringo"))
         */
        and(...conditions: boolean[]): boolean;
    
        /**
         * An OData "+" operation
         * @example add(x.bandMembersCount, 4)
         */
        add(lhs: number, rhs: number, outputType?: RealNumberTypes): number;
    
        /**
         * An OData "in" operation
         * @param mapper  An optional mapper to map the rhs to a string. The mapper should return values unencoded
         * @example isIn(x.bandLeader, ["John", "Paul"])
         */
        isIn<T>(lhs: T, rhs: T[], mapper?: (x: T) => string): boolean;
    
        /**
         * Do an OData "any" operation on a collection
         * @example any(x.bandMembers, bandMember => eq(bandMember, "Ringo"))
         */
        any<T>(collection: T[], collectionItemOperation: (item: T) => boolean): boolean;
    }

    $select: {
    
    }

    $expand: {
    
    }

    $orderby: {
        /**
         * Add a custom expand string
         * @example orderByRaw("property1 asc")
         */
        orderByRaw(orderByString: string): any;
    
        /**
         * Order results. Use an array to group properties with their direction if necessary
         * @example expand(my.prop1, [my.prop2, "desc"], my.collection.$count)
         */
        orderBy(...properties: (any | [any, "asc" | "desc"])[]): any;
    }

    $search: {
    
    }

    /** Add a $top paging parameter to the query */
    $top(top: number): number;

    /** Add a $skip paging parameter to the query */
    $skip(skip: number): number;

    /** Add a $count parameter to the query */
    $count(): number;

    /**
     * Add a custom query param
     * @param paramName The name. If this param is added at the root query level, it's value will not be url encoded. Otherwise it will
     * @param value The value
     * @example custom("$filter", "name eq 'John'")
     */
    custom(paramName: string, value: any): any;
}