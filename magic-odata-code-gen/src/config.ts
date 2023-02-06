
/**
 * Structure of a config file for code generation
 */
export type Config = {

    /**
     * Required
     * The location of the odata config file. This file is usually exposed from an endpoint: "/odata/$metadata"
     * Exactly one of the following properties must be entered
     */
    inputFileLocation: Partial<{
        fromFile: string,
        // TODO: auth???
        fromUri: string,
        fromString: string
    }>,

    /**
     * If set to true, will print the value of the odata $metadata used on screen
     */
    printOData$metadata?: boolean,

    /**
     * Required
     * The name of the file to store the output in
     */
    outputFileLocation: string,

    /**
     * Settings for code generation
     */
    codeGenSettings?: CodeGenConfig,

    /**
     * Settings for code generation
     */
    warningSettings?: SupressWarnings
}

// TODO: double check that the "to supress this warning, set.... " messages are correct
/**
 * Structure of settings to supress warnings
 */
export type SupressWarnings = Partial<{
    /** 
     * @default false
     */
    suppressAll: boolean

    /** 
     * @default false
     */
    suppressUnableToVerifyOdataVersion: boolean

    /** 
     * @default false
     */
    suppressUnableToFindTypeForEntitySet: boolean

    /** 
     * @default false
     */
    suppressMultipleBaseTypes: boolean

    /** 
     * @default false
     */
    suppressTypeNameOverlap: boolean

    /** 
     * @default false
     */
    suppressEnumIssuesValue: boolean

    /** 
     * @default false
     */
    suppressIgnoredBaseType: boolean

    /** 
     * @default false
     */
    suppressIgnoredKeyType: boolean
}>

export enum TypeCaseSettings {
    /**
     * Use case rules from $metadata file
     */
    Follow$metadata = "Follow$metadata",

    /**
     * Convert property names to "PascalCase" (aka lower camel case)
     */
    PascalCase = "PascalCase",

    /**
     * Convert property names to "camelCase"
     */
    CamelCase = "CamelCase"
}

export enum AsyncType {
    /**
     * HttpClient results will be Promises
     */
    Promise = "Promise",

    /**
     * HttpClient results will be rxjs Observables
     */
    RxJs = "RxJs"
}

export enum AngularHttpResultType {
    /**
     * Let angular parse response data as a string
     * Default
     */
    String = "String",

    /**
     * Let angular parse response data as a Blob
     */
    Blob = "Blob",

    /**
     * Let angular parse response data as an ArrayBuffer
     */
    ArrayBuffer = "ArrayBuffer"
}

export type AngularConfig = {
    /**
     * The type of angular http result to use from the angular http client
     */
    httpResultType: AngularHttpResultType
}

// TODO: settings from cmd
// TODO: test all
export type CodeGenConfig = Partial<{

    /** 
     * Specifies how to write the config json object. If true, will pretty print
     * @default false
     */
    prettyPrintJsonConfig: boolean,

    /** 
     * If true, the type definition json object will be exported as "rootConfigExporter". For debug purposes only
     * @default false
     */
    exportTypeDefinitionJsObject: boolean,

    /** 
     * Specifies how to name query builder classes. Use "{0}" to inject the name of the type
     * that this query builder is for
     * @default "{0}QueryBuilder"
     */
    // TODO: are query builders still classes? Have they been changed to functions?
    queryBuilderClassNameTemplate: string,

    /** 
     * Specifies how to name queryable types. Use "{0}" to inject the name of the type
     * that this queryable is for
     * @default "Queryable{0}"
     */
    queryableTypeNameTemplate: string,

    /** 
     * Specifies how to name key builder types. Use "{0}" to inject the name of the type
     * that this queryable is for
     * @default "{0}KeyBuilder"
     */
    keyBuilderTypeNameTemplate: string,

    /** 
     * Specifies how to name caster types. Use "{0}" to inject the name of the type
     * that this caster is for
     * @default "{0}Caster"
     */
    casterTypeNameTemplate: string,

    /** 
     * Specifies how to name caster types. Use "{0}" to inject the name of the type
     * that this sub path is for
     * @default "{0}SubPath"
     */
    subPathTypeNameTemplate: string,

    /** 
     * If set, dictates how many spaces constitute a tab
     * @default 2
     */
    tabSize: number

    /** 
     * If set to true, will leave out properties of query objects where the type info cannot be found. 
     * Otherwise, throw an error
     * @default false
     */
    ignorePropertiesWithMissingTypeInfo: boolean

    /** 
     * A character to use instead of special characters when found in namespaces. 
     * Special characters are characters which will cause typesript build errors when part of a module name
     * @default "."
     */
    namespaceSpecialCharacter: string

    /** 
     * The name of the http client to export
     * @default "ODataClient"
     */
    oDataClientName: string

    /** 
     * If true, all properties in generated files with be postixed with "?"
     * @default false
     */
    makeAllPropsOptional: boolean

    /** 
     * Specifies whether enums should be represented by their name or their value
     * Specify the value "String" or "Number" to apply this rule to all enums
     * For more fine grained control, use an object with a default, and specify exceptions in the 
     * "stringEnums" or "numberEnums" properties
     * @default "String"
     */
    enumType:
    | "String"
    | "Number"
    | {
        default: "String" | "Number",

        /**
         * Enums to represent as strings. The enum name should be in the form of "{{namespace}}/{{name}}"
         */
        stringEnums?: string[],

        /**
         * Enums to represent as numbers. The enum name should be in the form of "{{namespace}}/{{name}}"
         */
        numberEnums?: string[]
    }

    /** 
     * Specifies whether to change the names of properties or query properties
     * to upper or lower case, regardless of what is in the $metadata file
     * @default { serviceReturnTypes: "Follow$metadata", queryTypes: "Follow$metadata" }
     */
    propertyCasingRules: Partial<{
        serviceReturnTypes: TypeCaseSettings,
        queryTypes: TypeCaseSettings
    }>

    // TODO: test older versions of angular
    /** 
     * If true, will generate http clients with an angular HttpClient as input
     * If true, will use a default value for the finer config details. See AngularConfig for finer options details 
     * 
     * @default false
     */
    angularMode:
    | boolean
    | AngularConfig

    /** 
     * Defines the type of outputs for the HttpClient
     * 
     * @default "Promise"
     */
    asyncType: AsyncType,

    /** 
     * Remove entities from the generate code which are not specified in the whitelist
     * ignore is applied before "rename"
     * Values should be a concatenation of the namesapce and name, separated by a "/"
     * 
     * Default: use all entities
     */
    entityWhitelist: Partial<{

        /** 
         * Defines rename strategies for entity namespaces.
         * 
         * @example ["My.OData.Ns/MyType", "My.OData.Ns/MyType2"] - Generate a client for types "MyType" and "MyType2" in namespace "My.OData.Ns" only
         */
        entities: string[]
    }>,

    /** 
     * Defines rename strategies for entities and entity containers
     */
    rename: Partial<{

        /** 
         * Defines rename strategies for entity namespaces.
         * 
         * @example { "My/OData/Ns": "" } - remove namespaces from all entites in the "My/OData/Ns" namespace
         */
        entityNamespaces: { [key: string]: string }

        /** 
         * Defines rename strategies for entity containers
         * 
         * @example { "My/OData/Ns": "" } - Places all entity sets in the "My/OData/Ns" container at the root of the generated http client
         */
        entityContainers: { [key: string]: string }
    }>
}>