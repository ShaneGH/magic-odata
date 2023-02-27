
import { useNamespaces } from 'xpath'
import { ODataServiceTypes, ODataComplexType, ODataTypeRef, ODataSingleTypeRef, ODataServiceConfig, ODataEntitySetNamespaces, ODataEntitySet, ODataEnum, ComplexTypeOrEnum, Function, FunctionParam } from 'magic-odata-shared'
import { SupressWarnings } from './config.js';
import { warn } from './utils.js';

const ns = {
    edmx: "http://docs.oasis-open.org/odata/ns/edmx",
    edm: "http://docs.oasis-open.org/odata/ns/edm"
};

function nsLookup<T>(rootNode: Node, xpath: string) {
    return useNamespaces(ns)(xpath, rootNode) as T[]
}

export function processConfig(warningConfig: SupressWarnings, config: Document): ODataServiceConfig {

    checkVersion(warningConfig, config);
    return {
        types: processTypes(warningConfig, config),
        entitySets: processEntitySets(warningConfig, config),
        unboundFunctions: processUnboundFunctions(warningConfig, config)
    };
}

function processUnboundFunctions(warningConfig: SupressWarnings, config: Document) {
    return processFunctions(warningConfig, config, x => {
        const isBound = nsLookup<Attr>(x, "@IsBound")
        return !isBound.length || /^false$/i.test(isBound[0].value)
    })
}

function processFunctions(warningConfig: SupressWarnings, config: Document, filter: (node: Node) => boolean) {
    return findFunctions(config, filter)
        .map(processFunction.bind(null, warningConfig))
        .filter(x => !!x)
        .map(x => x!)
}

function findFunctions(config: Document, filter: (node: Node) => boolean) {
    return nsLookup<Node>(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:Function")
        .filter(filter)
}

function processFunction(warningConfig: SupressWarnings, f: Node): Function | null {

    var name = nsLookup<Attr>(f, "@Name")
    if (name.length !== 1) {
        let names = name.map(x => x.value).join(", ")
        names = names && ` (${names})`

        warn(warningConfig, "suppressInvalidFunctionConfiguration", `Found function with ${name.length} names${names}. Ignoring.`);
        return null
    }

    var returnType = nsLookup<Attr>(f, "edm:ReturnType/@Type")
    if (returnType.length !== 1) {
        warn(warningConfig, "suppressInvalidFunctionConfiguration", `Function ${name[0].value} has ${returnType.length} return types. Ignoring.`);
        return null
    }

    const params = nsLookup<Node>(f, "edm:Parameter")
        .map(x => processFunctionParam(name[0].value, x, warningConfig)!)

    if (params.filter(x => !x).length) {
        return null;
    }

    return {
        name: name[0].value,
        params,
        returnType: parseTypeStr(returnType[0].value)
    }
}

function processFunctionParam(fName: string, param: Node, warningConfig: SupressWarnings): FunctionParam | null {

    const name = nsLookup<Attr>(param, "@Name")
    if (name.length !== 1) {
        let names = name.map(x => x.value).join(", ")
        names = names && ` (${names})`
        warn(warningConfig, "suppressInvalidFunctionConfiguration", `Function ${fName} has a parameter with ${name.length} names${names}. Ignoring.`);
        return null
    }

    var paramType = nsLookup<Attr>(param, "@Type")
    if (paramType.length !== 1) {
        warn(warningConfig, "suppressInvalidFunctionConfiguration", `Function ${fName} has a parameter ${name[0].value} with ${paramType.length} types. Ignoring.`);
        return null
    }

    return {
        isBindingParameter: "bindingParameter" === name[0].value,
        name: name[0].value,
        type: parseTypeStr(paramType[0].value)
    }
}

function processTypes(warningConfig: SupressWarnings, config: Document): ODataServiceTypes {

    const complexTypes = nsLookup<Node>(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:EntityType")
        .concat(nsLookup<Node>(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:ComplexType"))
        .map((x: Node): ComplexTypeOrEnum => ({
            containerType: "ComplexType",
            type: mapEntityType(warningConfig, x)
        }));

    const enumTypes = nsLookup(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:EnumType")
        .map(x => mapEnumType(warningConfig, x as Node))
        .filter(x => !!x)
        .map((x: ODataEnum | null): ComplexTypeOrEnum => ({
            containerType: "Enum",
            type: x!
        }));

    return complexTypes
        .concat(enumTypes)
        .reduce(sortComplexTypesIntoNamespace, {});
}

function processEntitySets(warningConfig: SupressWarnings, config: Document): ODataEntitySetNamespaces {

    return nsLookup<Node>(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:EntityContainer")
        .map(x => mapEntityContainer(warningConfig, x))
        .reduce((s, x) => [...s, ...x], [])
        .reduce(sortEntitySetsIntoNamespace, {});
}

function mapEntityContainer(warningConfig: SupressWarnings, entityContainer: Node): ODataEntitySet[] {
    const namespaces = nsLookup(entityContainer, "@Name") as Attr[];
    if (namespaces.length > 1) {
        const names = namespaces.map(x => x.value).join(", ");
        console.warn(`Found more than one Name for EntityContianer: ${names}. Using first value.`);
    }

    const namespace = namespaces[0]?.value || "";
    return nsLookup<Node>(entityContainer, "edm:EntitySet")
        .map(node => mapEntitySet(warningConfig, namespace, node))
        .concat(nsLookup<Node>(entityContainer, "edm:Singleton")
            .map(node => mapSingleton(namespace, node)));
}

function processEntitySetFunctions(warningConfig: SupressWarnings, config: Document, forType: ODataSingleTypeRef) {
    return processFunctions(warningConfig, config, x => {
        const isBound = nsLookup<Attr>(x, "@IsBound")
        if (!isBound.length || !/^true$/i.test(isBound[0].value)) {
            return false
        }

        const bindingParameter = nsLookup<Node>(x, 'edm:Parameter[@Name="bindingParameter"]')
        if (!bindingParameter.length) {
            return false
        }

        const bindingParameterType = nsLookup<Attr>(x, "edm:Parameter/@Type")
        return bindingParameterType[0]?.value === `Collection(${forType.namespace && `${forType.namespace}.`}${forType.name})`
    })
}

function mapEntitySet(warningConfig: SupressWarnings, namespace: string, entitySet: Node): ODataEntitySet {

    const name = getName(entitySet, "@Name", namespace);
    const forType = getSingleType(entitySet, "@EntityType", namespace, name);

    return {
        isSingleton: false,
        namespace,
        name: name,
        forType,
        collectionFunctions: !entitySet.ownerDocument
            ? []
            : processEntitySetFunctions(warningConfig, entitySet.ownerDocument, forType)
    };
}

function mapSingleton(namespace: string, entitySet: Node): ODataEntitySet {

    const name = getName(entitySet, "@Name", namespace);
    const forType = getSingleType(entitySet, "@Type", namespace, name);
    return {
        isSingleton: true,
        namespace,
        name: name,
        forType,
        // functions are on the entity itself
        collectionFunctions: []
    };
}

function getName(entitySet: Node, nameAttr: string, namespace: string) {

    const name = nsLookup(entitySet, nameAttr) as Attr[];
    if (name.length > 1) {
        const names = name.map(x => x.value).join(", ");
        console.warn(`Found more than one Name for EntitySet: ${names}. Using first value.`);
    } else if (!name.length) {
        throw new Error(`Could not find name for entity set in collection ${namespace}`);
    }

    return name[0].value;
}

function getSingleType(entitySet: Node, typeAttr: string, namespace: string, forName: string): ODataSingleTypeRef {

    const type = nsLookup(entitySet, typeAttr) as Attr[];
    if (type.length > 1) {
        const names = type.map(x => x.value).join(", ");
        console.warn(`Found more than one Name for EntityContianer: ${names}. Using first value.`);
    } else if (!type.length) {
        throw new Error(`Could not find type for entity set ${forName} in collection ${namespace}`);
    }

    let result = parseTypeStr(type[0].value)
    if (!result.isCollection) return result;

    // TODO: possible to simulate this?
    console.warn(`EntityContianer ${type[0].value} refers to a collection. This is not supported. Unwrapping container to use entity type`);
    while (result.isCollection) {
        result = result.collectionType
    }

    return result
}

function checkVersion(warningConfig: SupressWarnings, config: Document) {
    if (warningConfig.suppressAll || warningConfig.suppressUnableToVerifyOdataVersion) {
        return;
    }

    try {
        const version = nsLookup(config, "edmx:Edmx");
        if (!version.length) {
            warn(warningConfig, "suppressUnableToVerifyOdataVersion", "Could not find element edmx:Edmx. Unable to check odata version.")
        }

        for (let i = 0; i < version.length; i++) {
            const vs = nsLookup(version[i] as Node, "@Version");
            if (!vs.length) {
                warn(warningConfig, "suppressUnableToVerifyOdataVersion", "Could not find Version attribute of element edmx:Edmx. Unable to check odata version")
                return;
            }

            if (vs.length > 1) {
                warn(warningConfig, "suppressUnableToVerifyOdataVersion", "Multiple Version attributes found in element edmx:Edmx. Unable to check odata version")
            }

            const v = (vs[0] as Attr)?.value || "";
            if (!/^\s*4(\.|(\s*$))/.test(v)) {
                warn(warningConfig, "suppressUnableToVerifyOdataVersion", `Unsupported odata version: ${v}. Only version 4 is suppoerted`)
            }
        }
    } catch {
        warn(warningConfig, "suppressUnableToVerifyOdataVersion", "Error checking odata version")
    }
}

function sortComplexTypesIntoNamespace(root: ODataServiceTypes, type: ComplexTypeOrEnum): ODataServiceTypes {
    const ns = root[type.type.namespace] || {};

    return {
        ...root,
        [type.type.namespace]: {
            ...ns,
            [type.type.name]: type
        }
    };
}

function sortEntitySetsIntoNamespace(root: ODataEntitySetNamespaces, type: ODataEntitySet): ODataEntitySetNamespaces {
    const ns = root[type.namespace] || {};

    return {
        ...root,
        [type.namespace]: {
            ...ns,
            [type.name]: type
        }
    };
}

function getEnumValue(warningConfig: SupressWarnings, attr?: Attr) {

    if (!attr) {
        if (!warningConfig?.suppressEnumIssuesValue) {
            warn(warningConfig, "suppressEnumIssuesValue", `Found enum member with no value. Ignoring.`);
        }

        return null;
    }

    const value = parseInt(attr.value || "");
    if (isNaN(value)) {
        if (!warningConfig?.suppressEnumIssuesValue) {
            warn(warningConfig, "suppressEnumIssuesValue", `Found enum member with invalid value: ${attr.value}. Ignoring.`);
        }

        return null;
    }

    return value;
}

function getEnumMember(warningConfig: SupressWarnings, attr?: Attr) {

    if (!attr) {
        if (!warningConfig?.suppressEnumIssuesValue) {
            warn(warningConfig, "suppressEnumIssuesValue", `Found enum member with no name. Ignoring.`);
        }

        return null;
    }

    return attr.value;
}

function mapEnumType(warningConfig: SupressWarnings, node: Node): ODataEnum | null {

    const members = nsLookup<Node>(node, "edm:Member")
        .map(n => ({
            name: getEnumMember(warningConfig, nsLookup<Attr>(n, "@Name")[0]),
            value: getEnumValue(warningConfig, nsLookup<Attr>(n, "@Value")[0]),
        }))
        .reduce((s, x) => x.name === null || x.value === null
            ? s
            : {
                ...s,
                [x.name]: x.value
            }, {} as { [key: string]: number });

    const name = nsLookup<Attr>(node, "@Name");
    if (!name.length) {
        warn(warningConfig, "suppressEnumIssuesValue", `Found enum with no name. Ignoring.`);
        return null;
    }

    if (name.length !== 1 && !warningConfig?.suppressEnumIssuesValue) {
        warn(warningConfig, "suppressEnumIssuesValue", `Found enum with no multiple names. Using first.`);
    }

    return {
        namespace: (nsLookup(node.parentNode!, "@Namespace")[0] as Attr)?.value || "",
        name: name[0].value,
        members
    }
}

function processEntityFunctions(warningConfig: SupressWarnings, config: Document, forType: ODataSingleTypeRef) {
    return processFunctions(warningConfig, config, x => {
        const isBound = nsLookup<Attr>(x, "@IsBound")
        if (!isBound.length || !/^true$/i.test(isBound[0].value)) {
            return false
        }

        const bindingParameter = nsLookup<Node>(x, 'edm:Parameter[@Name="bindingParameter"]')
        if (!bindingParameter.length) {
            return false
        }

        const bindingParameterType = nsLookup<Attr>(x, "edm:Parameter/@Type")
        return bindingParameterType[0]?.value === `${forType.namespace && `${forType.namespace}.`}${forType.name}`
    })
}

function mapEntityType(warningConfig: SupressWarnings, node: Node): ODataComplexType {

    const name = getName();
    const namespace = (nsLookup(node.parentNode!, "@Namespace")[0] as Attr)?.value || "";

    return {
        namespace,
        name,
        functions: node.ownerDocument
            ? processEntityFunctions(warningConfig, node.ownerDocument, { isCollection: false, namespace, name })
            : [],
        keyProps: keyTypes(),
        baseType: baseType(),
        properties: nsLookup(node, "edm:Property")
            .map(prop => ({ navigationProp: false, prop: prop as Node }))
            .concat(nsLookup(node, "edm:NavigationProperty")
                .map(prop => ({ navigationProp: true, prop: prop as Node })))
            .map(x => mapProperty(x))
            .reduce((s, x) => ({ ...s, ...x }), {})
    };

    function keyTypes() {

        const t = (nsLookup(node, "edm:Key/edm:PropertyRef/@Name") as Attr[]).map(x => x.value);
        return t.length ? t : undefined;
    }

    function baseType() {

        const baseType = nsLookup(node, "@BaseType") as Attr[];
        if (baseType.length > 1 && !warningConfig.suppressAll && !warningConfig.suppressMultipleBaseTypes) {
            console.warn(`Found multiple base types for ${getName()}: ${baseType.map(x => x.value)}. Using first one found`);
        }

        if (!baseType.length) {
            return undefined;
        }

        const dot = baseType[0].value.lastIndexOf(".")
        return dot === -1
            ? { namespace: "", name: baseType[0].value }
            : { namespace: baseType[0].value.substring(0, dot), name: baseType[0].value.substring(dot + 1) };
    }

    function getName() {
        const val = (nsLookup(node, "@Name")[0] as Attr)?.value;
        if (!val) {
            throw new Error("Found edm:EntityType with no @Name");
        }

        return val;
    }
}

function parseTypeStr(type: string): ODataTypeRef {
    const collectionType = /^Collection\((.+?)\)$/.exec(type || "");
    if (collectionType) {
        return {
            isCollection: true,
            collectionType: parseTypeStr(collectionType[1])
        };
    }

    const nameI = type.lastIndexOf(".");
    const name = nameI === -1 ? type : type.substring(nameI + 1);
    const namespace = (nameI === -1 ? null : type.substring(0, nameI)) || "";

    return {
        name,
        namespace,
        isCollection: false
    }
}

function parseType(type: Attr) {
    return parseTypeStr(type.value);
}

function mapProperty(x: { navigationProp: boolean, prop: Node }) {
    const name = nsLookup(x.prop, "@Name")[0] as Attr | undefined
    const type = nsLookup(x.prop, "@Type")[0] as Attr | undefined
    const nullable = nsLookup(x.prop, "@Nullable")[0] as Attr | undefined

    if (!name) {
        throw new Error("Found edm:Property with no name");
    }

    if (!type) {
        throw new Error(`Found edm:Property with no type: ${name}`);
    }

    return {
        [name.value]: {
            nullable: !nullable || /^\s*true\s*$/.test(nullable.value),
            navigationProperty: x.navigationProp,
            type: parseType(type)
        }
    };
}