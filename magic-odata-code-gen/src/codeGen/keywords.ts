import { AsyncType, CodeGenConfig } from "../config.js";
import { Dict, Tab } from "./utils.js";

export type Keywords = {
    mergeMap: string
    map: string
    RequestOptions: string
    DateStruct: string
    DurationStruct: string
    TimeStruct: string
    OffsetStruct: string
    ODataServiceConfig: string
    QueryPrimitive: string
    QueryCollection: string
    QueryComplexObject: string
    QueryEnum: string
    EntitySet: string
    IEntitySet: string
    rootConfig: string
    rootConfigExporter: string
    CastSelection: string
    DateAlias: string
    KeySelection: string
    SubPathSelection: string
    RequestTools: string,
    ODataTypeRef: string
    _httpClientArgs: string,
    WithKeyType: string
    ODataCollectionResult: string
    ODataResult: string
    SingleItemsCannotBeQueriedByKey: string
    CastingOnCollectionsOfCollectionsIsNotSupported: string
    QueryingOnCollectionsOfCollectionsIsNotSupported: string
    ThisItemDoesNotHaveAKey: string,
    toODataTypeRef: string,
    responseParser: string,
    DefaultResponseInterceptor: string
    parseAngularBlob: string
    parseAngularString: string
    parseAngularArrayBuffer: string
    Observable: string
    HttpError: string,
    AngularHttpResponse: string
    $ValueAnd$CountTypesCanNotBeOperatedOn: string
    PrimitiveSubPath: string
    CollectionSubPath: string
};

export function generateKeywords(allNamespaces: string[], rootLevelTypes: string[]): Keywords {

    if (rootLevelTypes.indexOf("Edm") !== -1) {
        throw new Error('You cannot have a root level type named "Edm". "Edm" is a namespace reserved by OData for primitive types');
    }
    const lookup = allNamespaces
        .map(x => x.split("."))
        .map(x => x[0])
        .filter(x => !!x)
        .concat(rootLevelTypes)
        .reduce((s, x) => ({ ...s, [x]: true }), {} as Dict<boolean>)

    const keys = Object.keys(lookup)

    return {
        CollectionSubPath: getKeyword("CollectionSubPath"),
        RequestOptions: getKeyword("RequestOptions"),
        $ValueAnd$CountTypesCanNotBeOperatedOn: getKeyword("$ValueAnd$CountTypesCanNotBeOperatedOn"),
        DurationStruct: getKeyword("DurationStruct"),
        DateStruct: getKeyword("DateStruct"),
        TimeStruct: getKeyword("TimeStruct"),
        OffsetStruct: getKeyword("OffsetStruct"),
        DateAlias: getKeyword("DateAlias"),
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
        EntitySet: getKeyword("EntitySet"),
        IEntitySet: getKeyword("IEntitySet"),
        rootConfig: getKeyword("rootConfig"),
        ODataServiceConfig: getKeyword("ODataServiceConfig"),
        ODataCollectionResult: getKeyword("ODataCollectionResult"),
        ODataResult: getKeyword("ODataResult"),
        _httpClientArgs: getKeyword("_httpClientArgs"),
        SingleItemsCannotBeQueriedByKey: getKeyword("SingleItemsCannotBeQueriedByKey"),
        PrimitiveSubPath: getKeyword("PrimitiveSubPath"),
        CastingOnCollectionsOfCollectionsIsNotSupported: getKeyword("CastingOnCollectionsOfCollectionsIsNotSupported"),
        QueryingOnCollectionsOfCollectionsIsNotSupported: getKeyword("QueryingOnCollectionsOfCollectionsIsNotSupported"),
        ThisItemDoesNotHaveAKey: getKeyword("ThisItemDoesNotHaveAKey")
    }

    function getKeyword(defaultVal: string) {
        if (!lookup[defaultVal]) return defaultVal;

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
${tab(importWithAlias("RequestOptions"))},
${tab(importWithAlias("$ValueAnd$CountTypesCanNotBeOperatedOn"))},
${tab(importWithAlias("DateStruct"))},
${tab(importWithAlias("TimeStruct"))},
${tab(importWithAlias("DurationStruct"))},
${tab(importWithAlias("OffsetStruct"))},
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
${tab(importWithAlias("EntitySet"))},
${tab(importWithAlias("IEntitySet"))},
${tab(importWithAlias("QueryComplexObject"))},
${tab(importWithAlias("ODataCollectionResult"))},
${tab(importWithAlias("ODataResult"))},
${tab(importWithAlias("SingleItemsCannotBeQueriedByKey"))},
${tab(importWithAlias("ThisItemDoesNotHaveAKey"))},
${tab(importWithAlias("CastingOnCollectionsOfCollectionsIsNotSupported"))},
${tab(importWithAlias("QueryingOnCollectionsOfCollectionsIsNotSupported"))}
} from 'magic-odata-client';`

    return [odataTsClient, ng, rxjs]
        .filter(x => !!x)
        .join("\n\n")

    function importWithAlias(importName: keyof Keywords, libImportName?: string) {
        if (!keywords[importName]) {
            throw new Error(`Invalid keyword: ${importName}`);
        }
        return !libImportName && keywords[importName] === importName ? importName : `${libImportName || importName} as ${keywords[importName]}`
    }
}