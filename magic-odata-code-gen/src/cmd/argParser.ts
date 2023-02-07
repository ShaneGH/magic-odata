
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
}

export type MetadataUrlCommandLineArgs = {
    type: "Metadata"
    metadataUrl: string
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
        return null;
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

export function parseArgs(args: string[]): CommandLineArgs | 0 | 1 {

    var parsed = args.reduce(parseArg, { flags: [], keyValues: {} })
    if (!parsed) {
        err(true)
        return 1
    }

    if (parsed.flags.find(x => /^h(elp)?$/i.test(x))) {

        err(false)
        return 0
    }

    if (parsed.flags.length) {
        err(true)
        return 1
    }

    if (parsed.keyValues["config"]?.length && parsed.keyValues["metadataUrl"]?.length) {
        err(true)
        return 1
    }

    if (!parsed.keyValues["config"]?.length && !parsed.keyValues["metadataUrl"]?.length) {
        err(true)
        return 1
    }

    if (parsed.keyValues["config"]?.length === 1) {
        return {
            type: "ConfigFile",
            configFile: parsed.keyValues["config"][0]
        }
    }

    if (parsed.keyValues["metadataUrl"]?.length === 1) {
        return {
            type: "Metadata",
            metadataUrl: parsed.keyValues["metadataUrl"][0]
        }
    }

    err(true)
    return 1
}

function err(error: boolean) {
    const log = error ? (x: string) => console.error(x) : (x: string) => console.log(x)

    log("magic-odata-code-gen")
    log("Generate a quick and dirty client:")
    log("node node_modules/magic-odata-code-gen/dist/index.js --metadataUrl 'http://localhost:5432/odata/$metadata'")
    log("")
    log("Generate a detailed client:")
    log("node node_modules/magic-odata-code-gen/dist/index.js --config ./my-config.json")
    log("The schema of the config file is defined here: https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-code-gen/src/config.ts")
    log("")
    log("")

}