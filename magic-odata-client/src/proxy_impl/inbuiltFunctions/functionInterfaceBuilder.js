
import { filterUtils, querySymbols } from "../../../dist/src/proxy_impl/inbuiltFunctions/functions.js"
import { writeFileSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// function trim(x) {
//     return x.replace(/(^\s+)|(\s+$)/g, "")
// }

// const fil = readFileSync("C:\\Dev\\magic-odata\\magic-odata-client\\src\\query\\filters.txt").toString()
// const yy = fil
//     .split(/\r?\n/)
//     .reduce((s, x) => {
//         if (/^\s+$/.test(x)) return s

//         if (x.indexOf("*") === -1) {
//             const key = x.replace(/\s/g, "")
//             if (s[key]) throw new Error(key)

//             return {
//                 ...s,
//                 current: [],
//                 done: {
//                     ...s.done,
//                     [key]: s.current
//                         .filter(x => trim(x) !== "/**" && trim(x) !== "*/")
//                         .map(x => x.replace(/^\s*\*/, ""))
//                         .map(x => x.replace(/^\s/, ""))
//                 }

//             }
//         }

//         return {
//             ...s,
//             current: [...s.current, x]
//         }

//     }, { current: [], done: {} })
// if (yy.current.length) throw new Error(yy.current.join("\n"))

// const str = Object
//     .keys(yy.done)
//     .map(key => `"${key.replace(/"/g, "\\\"")}": [\n${yy.done[key]
//         .map(l => `"${l.replace(/"/g, "\\\"")}"`)
//         .join(",\n")}\n]`)
//     .join(",\n\n")

// writeFileSync(join(__dirname, "functionInterfaceComments2.json"), "{" + str + "}")
const comments = JSON.parse(readFileSync(join(__dirname, "functionInterfaceComments.json")))

const rootGenericName = "TRootType"

function buildFns(name, overloads) {
    return overloads
        .map(x => buildFn(name, x))
        .filter(x => !!x)
}

function buildType(t) {
    if (t.isCollection) return `${buildType(t.collectionType)}[]`
    if (!t.namespace || t.namespace === "magic-odata.generics") return t.name
    if (t.namespace === "magic-odata" && t.name === "Raw") return "any"

    return `${t.namespace}.${t.name}`
}

function buildSignatureParamType(type) {
    const types = type.type === "Sum"
        ? type.typeRefs.map(buildType)
        : [buildType(type.typeRef)]

    return types.join(" | ")
}

function extractGeneric(oDataTypeRef) {
    if (oDataTypeRef.isCollection) {
        return extractGeneric(oDataTypeRef.collectionType)
    }

    return oDataTypeRef.namespace === "magic-odata.generics"
        ? oDataTypeRef.name
        : null
}

function extractGenerics(signatureParamType) {
    if (signatureParamType.type === "Rewrite") {
        return []
    }

    if (signatureParamType.argType.type === "Sum") {
        return signatureParamType.argType.typeRefs.flatMap(extractGeneric)
    }

    const gen = extractGeneric(signatureParamType.argType.typeRef)
    return gen
        ? [gen]
        : []
}

function buildRewriteArg(arg) {
    if (arg.type === "Mapper") {
        return `(x: ${buildSignatureParamType(arg.forType)}) => string`
    }

    if (arg.type === "OutputType") {
        return arg.outputEnum
    }

    if (arg.type === "FilterRawProps") {
        return `FilterableProps`
    }

    if (arg.type === "FilterRawExecutor") {
        return `(paths: FilterablePaths) => string`
    }

    if (arg.type === "LogicalCollectionOp") {
        return `(item: T) => boolean`
    }

    if (arg.type === "CustomQueryArg") {
        return `string`
    }

    if (arg.type === "OrderBy") {
        return '(any | [any, \"asc\" | \"desc\"])[]'
    }

    /*
    any<TQueryObj extends QueryObject<TArrayType>, TArrayType>(
        collection: QueryCollection<TQueryObj, TArrayType>,
        collectionItemOperation: ((t: TQueryObj) => Filter)): Filter;*/

    throw new Error(arg.type)
}

function buildArg(arg) {
    let type = arg.type === "Normal"
        ? buildSignatureParamType(arg.argType)
        : buildRewriteArg(arg.descriptor)

    const spread = arg.modifier === "Spread"
        ? "..."
        : ""

    const optional = arg.modifier === "Optional"
        ? "?"
        : ""

    return `${spread}${arg.name}${optional}: ${type}`
}

function buildFn(name, overload) {
    if (name.startsWith("__test")) return null

    const args = overload.inputArgs
        .map(buildArg)
        .join(", ")

    let generics = overload.inputArgs
        .flatMap(extractGenerics)
        .reduce((s, x) => s.includes(x) || x === rootGenericName ? s : [...s, x], [])
        .join(", ")

    if (generics) generics = `<${generics}>`
    const signature = `${name}${generics}(${args}): ${buildType(overload.outputType)};`

    const signatureKey = signature.replace(/\s/g, "")
    if (!comments[signatureKey]) throw new Error(signatureKey + "\n" + signature)

    return [
        ...(comments[signatureKey].length === 1
            ? [`/** ${comments[signatureKey][0]} */`]
            : ["/**",
                ...comments[signatureKey].map(x => ` * ${x}`),
                " */"]),
        signature
    ]
        .join("\n")
}

function tab(x) {
    return x
        .split(/\r?\n/)
        .map(x => "    " + x)
        .join("\n")
}

function buildNs(member) {
    return "{\n" + Object
        .keys(member)
        .flatMap(x => build(x, member[x]))
        .filter(x => !!x)
        .map(tab)
        .join("\n\n") + "\n}"
}

function build(name, member) {

    return member.type === "ns"
        ? [`${name}: ${buildNs(member.value)}`]
        : buildFns(name, member.value)
}

const outputFile = Object
    .keys(querySymbols)
    .flatMap(x => build(x, filterUtils[querySymbols[x]]))
    .filter(x => !!x)
    .map(tab)
    .join("\n\n")

const fileData = [
    'import { FilterablePaths, FilterableProps } from "../../query/filtering/op1.js"',
    'import { OutputTypes, RealNumberTypes } from "../../query/filtering/queryPrimitiveTypes0.js"',
    `\nexport interface QueryUtils<${rootGenericName}> {\n${outputFile}\n}`
].join("\n")

console.log(fileData)
writeFileSync(join(__dirname, "functionInterfaces.d.ts"), fileData)