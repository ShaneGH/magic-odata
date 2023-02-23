
type ParseArgState = {
    currentFlag?: string
    flags: string[]
    keyValues: {
        [k: string]: string[]
    }
}

export type CommandLineArgs = ConfigFileCommandLineArgs | MetadataUrlCommandLineArgs

export type ConfigFileCommandLineArgs = {
    type: "ConfigFile"
    configFile: string
    ciMode?: boolean
    httpHeaders?: [string, string][]
}

export type MetadataUrlCommandLineArgs = {
    type: "Metadata"
    metadataUrl: string
    ciMode?: boolean
    httpHeaders?: [string, string][]
}

function parseArg(state: ParseArgState | null, arg: string): ParseArgState | null {
    if (!state) return null;

    arg = (arg || "").replace(/(^\s+)|(\s+$)/, "")
    if (!arg || arg === "--") {
        return state
    }

    if (/^--/.test(arg)) {
        return {
            ...state,
            currentFlag: arg.substring(2),
            flags: state.currentFlag
                ? [...state.flags, state.currentFlag]
                : state.flags
        }
    }

    if (!state.currentFlag) {
        return state;
    }

    return {
        ...state,
        currentFlag: undefined,
        keyValues: {
            ...state.keyValues,
            [state.currentFlag]: state.keyValues[state.currentFlag]
                ? [...state.keyValues[state.currentFlag], arg]
                : [arg]
        }
    }
}

function validateArgs(args: ParseArgState) {

    const keys = Object.keys(args.keyValues)
    const multipleArgs = keys.filter(k => args.keyValues[k].length !== 1)
    if (multipleArgs.length) {
        console.log(`\nERROR: Unexpected args(s): ${multipleArgs}`)
        return false
    }

    if (keys.includes("config") && keys.includes("metadataUrl")) {
        console.log(`\nERROR: --config and --metadataUrl cannot be specified together`)
        return false
    }

    if (!keys.includes("config") && !keys.includes("metadataUrl")) {
        console.log(`\nERROR: Either --config or --metadataUrl must be specified`)
        return false
    }

    return true;
}

export function parseArgs(args: string[]): CommandLineArgs | 0 | 1 {

    var parsed = args.reduce(parseArg, { flags: [], keyValues: {} })
    if (parsed?.currentFlag) {
        parsed = {
            ...parsed,
            currentFlag: undefined,
            flags: [...parsed.flags, parsed.currentFlag]
        }
    }

    if (parsed && parsed.flags.find(x => /^h(elp)?$/i.test(x))) {

        err(false)
        return 0
    }

    if (!parsed || !validateArgs(parsed)) {
        console.log("")
        console.log("")
        err(true)
        return 1
    }

    if (parsed.keyValues["config"]?.length === 1) {
        return {
            type: "ConfigFile",
            configFile: parsed.keyValues["config"][0],
            ciMode: parsed.flags.includes("ciMode") ? true : undefined,
            httpHeaders: parsed.keyValues["httpHeaders"] && JSON.parse(parsed.keyValues["httpHeaders"][0])
        }
    }

    if (parsed.keyValues["metadataUrl"]?.length === 1) {
        return {
            type: "Metadata",
            metadataUrl: parsed.keyValues["metadataUrl"][0],
            ciMode: parsed.flags.includes("ciMode") ? true : undefined,
            httpHeaders: parsed.keyValues["httpHeaders"] && JSON.parse(parsed.keyValues["httpHeaders"][0])
        }
    }

    err(true)
    return 1
}

function err(error: boolean) {
    const log = error ? (x: string) => console.error(x) : (x: string) => console.log(x)

    log("magic-odata-code-gen")
    log("Generate a quick and dirty client:")
    log("  node node_modules/magic-odata-code-gen/dist/index.js --metadataUrl 'https://raw.githubusercontent.com/ShaneGH/magic-odata/main/docs/sampleOdataMetadata.xml'")
    log("")
    log("Generate a detailed client:")
    log("  node node_modules/magic-odata-code-gen/dist/index.js --config ./my-config.json")
    log("  The schema of the config file is defined here: https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-code-gen/src/config.ts")
    log("")
    log("Disable any prompts with --ciMode:")
    log("  node node_modules/magic-odata-code-gen/dist/index.js --config ./my-config.json --ciMode")
    log("")
    log("Specify --httpHeaders as a json array of arrays")
    log(`  node node_modules/magic-odata-code-gen/dist/index.js --config ./my-config.json --httpHeaders '[[\\"Authorization\\",\\"Bearer ...\\"]]'`)
    log("")
    log("")

}