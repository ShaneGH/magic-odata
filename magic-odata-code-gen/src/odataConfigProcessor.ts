
import { useNamespaces } from 'xpath'
import { ODataServiceTypes, ODataComplexType, ODataTypeRef, ODataSingleTypeRef, ODataServiceConfig, ODataEntitySetNamespaces, ODataEntitySet, ODataEnum, ComplexTypeOrEnum } from 'magic-odata-shared'
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
        entitySets: processEntitySets(config)
    };
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

function processEntitySets(config: Document): ODataEntitySetNamespaces {

    return nsLookup(config, "edmx:Edmx/edmx:DataServices/edm:Schema/edm:EntityContainer")
        .map(x => mapEntityContainer(x as Node))
        .reduce((s, x) => [...s, ...x], [])
        .reduce(sortEntitySetsIntoNamespace, {});
}

function mapEntityContainer(entityContainer: Node): ODataEntitySet[] {
    const namespaces = nsLookup(entityContainer, "@Name") as Attr[];
    if (namespaces.length > 1) {
        const names = namespaces.map(x => x.value).join(", ");
        console.warn(`Found more than one Name for EntityContianer: ${names}. Using first value.`);
    }

    const namespace = namespaces[0]?.value || "";
    return nsLookup(entityContainer, "edm:EntitySet")
        .map(node => mapEntitySet(namespace, node as Node))
        .concat(nsLookup(entityContainer, "edm:Singleton")
            .map(node => mapSingleton(namespace, node as Node)));
}

function mapEntitySet(namespace: string, entitySet: Node): ODataEntitySet {

    const name = getName(entitySet, "@Name", namespace);
    const forType = getType(entitySet, "@EntityType", namespace, name);
    return {
        isSingleton: false,
        namespace,
        name: name,
        forType
    };
}

function mapSingleton(namespace: string, entitySet: Node): ODataEntitySet {

    const name = getName(entitySet, "@Name", namespace);
    const forType = getType(entitySet, "@Type", namespace, name);
    return {
        isSingleton: true,
        namespace,
        name: name,
        forType
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

function getType(entitySet: Node, typeAttr: string, namespace: string, forName: string): ODataSingleTypeRef {

    const type = nsLookup(entitySet, typeAttr) as Attr[];
    if (type.length > 1) {
        const names = type.map(x => x.value).join(", ");
        console.warn(`Found more than one Name for EntityContianer: ${names}. Using first value.`);
    } else if (!type.length) {
        throw new Error(`Could not find type for entity set ${forName} in collection ${namespace}`);
    }

    const lastDot = type[0].value.lastIndexOf(".");
    return lastDot === -1
        // TODO: can this be true???
        ? { isCollection: false, namespace: "", name: type[0].value }
        : { isCollection: false, namespace: type[0].value.substring(0, lastDot), name: type[0].value.substring(lastDot + 1) };
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

function mapEntityType(warningConfig: SupressWarnings, node: Node): ODataComplexType {

    return {
        name: name(),
        keyProps: keyTypes(),
        baseType: baseType(),
        namespace: (nsLookup(node.parentNode!, "@Namespace")[0] as Attr)?.value || "",
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
            console.warn(`Found multiple base types for ${name()}: ${baseType.map(x => x.value)}. Using first one found`);
        }

        if (!baseType.length) {
            return undefined;
        }

        const dot = baseType[0].value.lastIndexOf(".")
        return dot === -1
            ? { namespace: "", name: baseType[0].value }
            : { namespace: baseType[0].value.substring(0, dot), name: baseType[0].value.substring(dot + 1) };
    }

    function name() {
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