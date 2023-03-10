
/**
 * Structure of a config file for code generation
 */
export type Config = {

    /**
     * Required
     * The location of the odata config file. This file is usually exposed from an endpoint: "/$metadata"
     * Exactly one of the following properties must be entered
     * 
     * See https://www.odata.org/blog/queryable-odata-metadata/
     */
    inputFileLocation: Partial<{
        /**
         * Read the $metadata file from the file system
         */
        fromFile: string,

        /**
         * Read the $metadata file from a remove url
         */
        fromUri: string,

        /**
         * Embed the metadata file in this config file
         */
        fromString: string
    }>,

    /**
     * Required
     * The name of the file to store the output in
     */
    outputFileLocation: string,

    /**
     * If set to true, will disable all command line prompts
     * Can also be overridden with the --ciMode command line arg
     * 
     * @default false
     */
    ciMode?: boolean,

    /**
     * If set, and the $metadata file is retrieved from a URL, will add these headers
     * To the http request. 
     * Can also be overridden with the --httpHeaders command line arg
     */
    httpHeaders?: [string, string][]

    /**
     * If set to true, will print the value of the odata $metadata used on screen
     */
    printOData$metadata?: boolean,

    /**
     * Settings for code generation
     */
    codeGenSettings?: CodeGenConfig,

    /**
     * Settings for code generation
     */
    warningSettings?: SupressWarnings
}

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

    /** 
     * @default false
     */
    suppressInvalidFunctionConfiguration: boolean

    /** 
     * @default false
     */
    supressAmbiguousFileLocation: boolean
}>

export enum TypeCaseSettings {
    /**
     * Use case rules from $metadata file
     */
    Follow$metadata = "Follow$metadata",

    /**
     * Convert property names to "PascalCase" (aka upper camel case)
     */
    PascalCase = "PascalCase",

    /**
     * Convert property names to "camelCase" (aka lower camel case)
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
     * Specifies how to name sub path types. Use "{0}" to inject the name of the type
     * that this sub path is for
     * @default "{0}SubPath"
     */
    subPathTypeNameTemplate: string,

    /** 
     * Specifies the name for entity set functions for a schema namespace
     * @default "EntitySetFunctions"
     */
    entitySetFunctionsTypeName: string,

    /** 
     * Specifies the name for unbound functions for a schema namespace
     * @default "UnboundFunctions"
     */
    unboundFunctionsTypeName: string,

    /** 
     * Specifies how to name entity Function types. Use "{0}" to inject the name of the type
     * that these functions are for
     * @default "{0}EntityFunctions"
     */
    entityFunctionContainerTypeNameTemplate: string,

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
     * If true, the OData client will be added to a module inside the generated file representing it's schema namespace
     * Otherwise the OData client will be added to the root of the generated file
     * 
     * You should set this to true if there are multiple Schemas in a single $metadata document
     * @default false
     */
    addODataClientToNamespace: boolean

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
     * Remove entities from the generated code which are not specified in the whitelist
     * ignore is applied before "rename"
     * Values should be a concatenation of the namesapce and name, separated by a "/"
     * 
     * Default: use all entities
     */
    entityWhitelist: Partial<{

        /** 
         * Defines whitelist strategies for entity namespaces.
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