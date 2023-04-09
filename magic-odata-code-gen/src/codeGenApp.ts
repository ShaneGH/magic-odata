import { existsSync, readFile, unlink, writeFile } from "fs";
import * as path from "path";
import { codeGen } from "./codeGen/codeGen.js";
import { Config } from "./config.js";
import { applyWhitelist } from "./whitelist.js";
import { loadConfig, LocationType, XmlLocation } from "./odataConfigLoader.js";
import { processConfig } from "./odataConfigProcessor.js";
import { applyRenames } from "./rename.js";
import { CommandLineArgs } from "./cmd/argParser.js";

async function persist(code: string, file: string) {
    console.log(`Saving: ${file}`);
    if (existsSync(file)) {
        await deleteFile(file);
    }

    await persistFile(file, code);
}

function deleteFile(file: string) {
    return new Promise((res, rej) => {
        unlink(file, err => err ? rej(err) : res(null));
    });
}

function loadFile(file: string) {
    return new Promise<string>((res, rej) => {
        readFile(file, (err, content) => err ? rej(err) : res(content.toString()));
    });
}

function persistFile(file: string, content: string) {
    return new Promise((res, rej) => {
        writeFile(file, content, err => err ? rej(err) : res(null));
    });
}

function loadConfigFile(location: string) {
    console.log("Loading config");
    return loadFile(location)
        .then(x => JSON.parse(x) as Config)
}

export function generateCode(odataConfig: XmlLocation, settings: Config, configFileLocation: string | null): Promise<string> {

    console.log("Generating code file");
    return loadConfig(settings, odataConfig, configFileLocation)
        .then(x => processConfig(settings.warningSettings || {}, x))
        .then(x => applyWhitelist(x, settings))
        .then(x => applyRenames(x, settings))
        .then(x => codeGen(x, settings.codeGenSettings, settings.warningSettings));
}

export function generateTypescriptFile(args: CommandLineArgs): Promise<void> {

    let configFile = args.type === "ConfigFile"
        ? loadConfigFile(args.configFile)
        : new Promise<Config>(res => res({ inputFileLocation: { fromUri: args.metadataUrl }, outputFileLocation: "./odataClient.ts" }))

    configFile = configFile
        .then(c => ({
            ...c,
            ciMode: args.ciMode == undefined ? c.ciMode : args.ciMode,
            httpHeaders: args.httpHeaders == undefined ? c.httpHeaders : args.httpHeaders
        }))

    return configFile
        .then(config => generateCode(getXmlLocation(config), config, args.type === "ConfigFile" ? args.configFile : null)
            .then(code => persist(code, outputFile(config))));

    function outputFile(config: Config) {
        if (!config.outputFileLocation) {
            throw new Error("outputFileLocation is not defined in config");
        }

        return args.type === "ConfigFile"
            ? path.join(path.dirname(args.configFile), config.outputFileLocation)
            : config.outputFileLocation
    }

    function getXmlLocation(config: Config): XmlLocation {
        const validation = [
            !!config.inputFileLocation?.fromFile,
            !!config.inputFileLocation?.fromString,
            !!config.inputFileLocation?.fromUri
        ]
            .filter(x => x)
            .length;

        if (validation !== 1) {

            throw new Error("You must specify exactly one of [inputFileLocation.fromFile, inputFileLocation.fromString, inputFileLocation.fromUri] in your config.");
        }

        if (config.inputFileLocation?.fromFile) {
            return {
                type: LocationType.FileLocation,
                path: config.inputFileLocation.fromFile
            };
        }


        if (config.inputFileLocation?.fromString) {
            return {
                type: LocationType.XmlString,
                xml: config.inputFileLocation.fromString
            };
        }


        return {
            type: LocationType.UriLocation,
            uri: config.inputFileLocation.fromUri as string
        };
    }
}