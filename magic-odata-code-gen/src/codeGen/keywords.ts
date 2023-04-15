import { AsyncType, CodeGenConfig } from "../config.js";
import { Dict, Tab } from "./utils.js";

export type Keywords = {
    SerializerSettings: string
    serializerSettings: string
    mergeMap: string
    map: string
    RequestOptions: string
    ODataServiceConfig: string
    QueryPrimitive: string
    QueryCollection: string
    QueryComplexObject: string
    QueryEnum: string
    RequestBuilder: string
    UnboundFunctionSet: string
    ODataEntitySet: string
    ODataSchema: string
    IEntitySet: string
    rootConfig: string
    rootConfigExporter: string
    CastSelection: string
    KeySelection: string
    SubPathSelection: string
    RequestTools: string,
    ODataTypeRef: string
    _httpClientArgs: string,
    WithKeyType: string
    ODataCollectionResult: string
    ODataResult: string
    SingleItemsCannotBeQueriedByKey: string
    CastingOnEnumsAndPrimitivesIsNotSupported: string
    CastingOnCollectionsOfCollectionsIsNotSupported: string
    QueryingOnCollectionsOfCollectionsIsNotSupported: string
    QueryingOnUnboundFunctionsIsNotSupported: string
    CastingOnUnboundFunctionsIsNotSupported: string
    ThisItemDoesNotHaveAKey: string,
    toODataTypeRef: string,
    toODataEntitySet: string,
    toODataSchema: string,
    responseParser: string,
    DefaultResponseInterceptor: string
    parseAngularBlob: string
    parseAngularString: string
    parseAngularArrayBuffer: string
    Observable: string
    HttpError: string,
    AngularHttpResponse: string
    PrimitiveSubPath: string
    CollectionSubPath: string
    EntitySetSubPath: string
    EdmDate: string
    EdmTimeOfDay: string
    EdmDuration: string
    EdmDateTimeOffset: string
    Params: string
};

export function generateKeywords(allNamespaces: string[], rootLevelTypes: string[]): Keywords {

    /* istanbul ignore next */
    if (rootLevelTypes.indexOf("Edm") !== -1) {
        throw new Error('You cannot have a root level type named "Edm". "Edm" is a namespace reserved by OData for primitive types');
    }
    const lookup = allNamespaces
        .map(x => x.split("."))
        .map(x => x[0])
        .filter(x => !!x)
        .concat(rootLevelTypes)
        .reduce((s, x) => ({ ...s, [x]: true }), {} as Dict<boolean>)

    return {
        serializerSettings: getKeyword("serializerSettings"),
        SerializerSettings: getKeyword("SerializerSettings"),
        EdmDate: getKeyword("EdmDate"),
        UnboundFunctionSet: getKeyword("UnboundFunctionSet"),
        EdmTimeOfDay: getKeyword("EdmTimeOfDay"),
        EdmDuration: getKeyword("EdmDuration"),
        EdmDateTimeOffset: getKeyword("EdmDateTimeOffset"),
        CollectionSubPath: getKeyword("CollectionSubPath"),
        EntitySetSubPath: getKeyword("EntitySetSubPath"),
        RequestOptions: getKeyword("RequestOptions"),
        mergeMap: getKeyword("mergeMap"),
        map: getKeyword("map"),
        AngularHttpResponse: getKeyword("HttpResponse"),
        parseAngularBlob: getKeyword("parseBlob"),
        parseAngularString: getKeyword("parseAngularString"),
        parseAngularArrayBuffer: getKeyword("parseAngularArrayBuffer"),
        HttpError: getKeyword("HttpError"),
        Observable: getKeyword("Observable"),
        DefaultResponseInterceptor: getKeyword("DefaultResponseInterceptor"),
        responseParser: getKeyword("responseParser"),
        toODataTypeRef: getKeyword("toODataTypeRef"),
        toODataEntitySet: getKeyword("toODataEntitySet"),
        toODataSchema: getKeyword("toODataSchema"),
        ODataSchema: getKeyword("ODataSchema"),
        QueryEnum: getKeyword("QueryEnum"),
        WithKeyType: getKeyword("WithKeyType"),
        ODataTypeRef: getKeyword("ODataTypeRef"),
        KeySelection: getKeyword("KeySelection"),
        RequestTools: getKeyword("RequestTools"),
        rootConfigExporter: getKeyword("rootConfigExporter"),
        QueryPrimitive: getKeyword("QueryPrimitive"),
        QueryCollection: getKeyword("QueryCollection"),
        QueryComplexObject: getKeyword("QueryComplexObject"),
        SubPathSelection: getKeyword("SubPathSelection"),
        CastSelection: getKeyword("CastSelection"),
        RequestBuilder: getKeyword("RequestBuilder"),
        ODataEntitySet: getKeyword("ODataEntitySet"),
        IEntitySet: getKeyword("IEntitySet"),
        rootConfig: getKeyword("rootConfig"),
        ODataServiceConfig: getKeyword("ODataServiceConfig"),
        ODataCollectionResult: getKeyword("ODataCollectionResult"),
        ODataResult: getKeyword("ODataResult"),
        _httpClientArgs: getKeyword("_httpClientArgs"),
        SingleItemsCannotBeQueriedByKey: getKeyword("SingleItemsCannotBeQueriedByKey"),
        PrimitiveSubPath: getKeyword("PrimitiveSubPath"),
        CastingOnCollectionsOfCollectionsIsNotSupported: getKeyword("CastingOnCollectionsOfCollectionsIsNotSupported"),
        CastingOnEnumsAndPrimitivesIsNotSupported: getKeyword("CastingOnEnumsAndPrimitivesIsNotSupported"),
        QueryingOnCollectionsOfCollectionsIsNotSupported: getKeyword("QueryingOnCollectionsOfCollectionsIsNotSupported"),
        QueryingOnUnboundFunctionsIsNotSupported: getKeyword("QueryingOnUnboundFunctionsIsNotSupported"),
        CastingOnUnboundFunctionsIsNotSupported: getKeyword("CastingOnUnboundFunctionsIsNotSupported"),
        ThisItemDoesNotHaveAKey: getKeyword("ThisItemDoesNotHaveAKey"),
        Params: getKeyword("Params")
    }

    function getKeyword(defaultVal: string) {
        if (!lookup[defaultVal]) return defaultVal;

        /* istanbul ignore next */
        // eslint-disable-next-line no-constant-condition
        for (let i = 1; true; i++) {
            const val = `${defaultVal}${i}`;
            if (!lookup[val]) return val;
        }
    }
}

export function imports(keywords: Keywords, tab: Tab, config: CodeGenConfig | null) {

    const ng = config?.angularMode && `import {
    ${tab(importWithAlias("AngularHttpResponse", "HttpResponse"))}
} from '@angular/common/http'`

    const rxjs = (config?.angularMode || config?.asyncType === AsyncType.RxJs) && `import {
    ${tab(importWithAlias("Observable"))},
    ${tab(importWithAlias("mergeMap"))},
    ${tab(importWithAlias("map"))},
} from 'rxjs'`

    const odataTsClient = `import {
${tab(importWithAlias("SerializerSettings"))},
${tab(importWithAlias("UnboundFunctionSet"))},
${tab(importWithAlias("Params"))},
${tab(importWithAlias("EdmDate"))},
${tab(importWithAlias("EdmTimeOfDay"))},
${tab(importWithAlias("EdmDuration"))},
${tab(importWithAlias("EdmDateTimeOffset"))},
${tab(importWithAlias("RequestOptions"))},
${tab(importWithAlias("HttpError"))},
${tab(importWithAlias("DefaultResponseInterceptor"))},
${tab(importWithAlias("KeySelection"))},
${tab(importWithAlias("WithKeyType"))},
${tab(importWithAlias("QueryEnum"))},
${tab(importWithAlias("ODataTypeRef"))},
${tab(importWithAlias("RequestTools"))},
${tab(importWithAlias("ODataServiceConfig"))},
${tab(importWithAlias("CastSelection"))},
${tab(importWithAlias("SubPathSelection"))},
${tab(importWithAlias("QueryPrimitive"))},
${tab(importWithAlias("QueryCollection"))},
${tab(importWithAlias("RequestBuilder"))},
${tab(importWithAlias("ODataEntitySet"))},
${tab(importWithAlias("ODataSchema"))},
${tab(importWithAlias("IEntitySet"))},
${tab(importWithAlias("QueryComplexObject"))},
${tab(importWithAlias("ODataCollectionResult"))},
${tab(importWithAlias("ODataResult"))},
${tab(importWithAlias("SingleItemsCannotBeQueriedByKey"))},
${tab(importWithAlias("ThisItemDoesNotHaveAKey"))},
${tab(importWithAlias("CastingOnEnumsAndPrimitivesIsNotSupported"))},
${tab(importWithAlias("CastingOnCollectionsOfCollectionsIsNotSupported"))},
${tab(importWithAlias("QueryingOnCollectionsOfCollectionsIsNotSupported"))},
${tab(importWithAlias("QueryingOnUnboundFunctionsIsNotSupported"))},
${tab(importWithAlias("CastingOnUnboundFunctionsIsNotSupported"))},
${tab(importWithAlias("PrimitiveSubPath"))},
${tab(importWithAlias("CollectionSubPath"))},
${tab(importWithAlias("EntitySetSubPath"))}
} from 'magic-odata-client';`

    return [odataTsClient, ng, rxjs]
        .filter(x => !!x)
        .join("\n\n")

    function importWithAlias(importName: keyof Keywords, libImportName?: string) {
        /* istanbul ignore next */
        if (!keywords[importName]) {
            throw new Error(`Invalid keyword: ${importName}`);
        }
        return !libImportName && keywords[importName] === importName ? importName : `${libImportName || importName} as ${keywords[importName]}`
    }
}