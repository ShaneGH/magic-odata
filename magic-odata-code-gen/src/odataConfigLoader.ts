
import fetch, { Response } from 'node-fetch'
import prompt from "prompt"
import * as fs from 'fs'
import { DOMParser } from '@xmldom/xmldom'
import { Config, SupressWarnings } from './config.js';
import * as path from 'path';
import { warn } from './utils.js';

export enum LocationType {
    FileLocation = "FileLocation",
    UriLocation = "UriLocation",
    XmlString = "XmlString"
}
export type FileLocation = { path: string, type: LocationType.FileLocation }
export type UriLocation = { uri: string, type: LocationType.UriLocation }
export type XmlString = { xml: string, type: LocationType.XmlString }
export type XmlLocation = FileLocation | UriLocation | XmlString

export async function loadConfig(config: Config, odataConfig: XmlLocation, configFileLocation: string | null) {

    const stringResultP = odataConfig.type == LocationType.FileLocation
        ? loadFromFile(odataConfig, process.cwd(), configFileLocation, config.warningSettings || null)
        : odataConfig.type == LocationType.UriLocation
            ? loadFromUri(odataConfig, config.httpHeaders, !config.ciMode)
            : new Promise<string>(res => res(odataConfig.xml));

    const stringResult = await stringResultP;
    if (config.printOData$metadata) {
        console.log(stringResult);
    }

    return new DOMParser().parseFromString(stringResult);
}

async function promptForAuthHeaders(response: Response): Promise<[string, string][]> {
    console.log("")
    console.log("")
    console.log(`Request for $metadata failed with status ${response.status} ${response.statusText}`)

    if (!await shouldTryAgainWithHeaders()) {
        return []
    }

    return await getHeaders()
}

function getHeader(index: number): Promise<[string, string]> {
    console.log(`\nEnter header ${index}. (Enter nothing to complete)`)

    return new Promise<[string, string]>((res, rej) => {

        const name = "Header Name"
        const value = "Header Value"
        prompt.get([name], (err, nameResult) => {
            if (err) {
                rej(err);
                return;
            }

            if (!nameResult[name]) {
                res(["", ""])
                return;
            }

            prompt.get([value], (err, valueResult) => {
                if (err) {
                    rej(err);
                    return;
                }

                res([nameResult[name].toString(), valueResult[value].toString()])
            });
        })
    });
}

async function getHeaders(): Promise<[string, string][]> {

    const headers: [string, string][] = []
    // eslint-disable-next-line no-constant-condition
    for (let i = 1; true; i++) {
        const header = await getHeader(i);
        if (!header[0]) { break }
        headers.push(header)
    }

    return headers
}

function shouldTryAgainWithHeaders(): Promise<boolean> {
    console.log(`Would you like to enter some HTTP headers and try again?`)

    return new Promise<boolean>((res, rej) => {
        const yN = "(y/n)"

        prompt.start();
        prompt.get([yN], (err, result) => {
            if (err) {
                rej(err);
                return;
            }

            if (/^\s*n\s*$/i.test(result[yN].toString() || "")) {
                res(false);
                return;
            }

            if (!/^\s*y\s*$/i.test(result[yN].toString() || "")) {
                rej(new Error(`Invalid selection: ${result[yN]}. Expecting ${yN}`));
                return;
            }

            res(true);
        })
    });
}

function loadFromUri(odataConfig: UriLocation, headers: [string, string][] = [], tryHandleError = true): Promise<string> {

    return fetch(odataConfig.uri, { headers })
        .then(async response => {

            if (response.status < 200 || response.status >= 300) {
                console.error(response);

                /* istanbul ignore next */
                if (!tryHandleError) {
                    throw new Error(response.statusText);
                }

                const authResult = await promptForAuthHeaders(response)
                /* istanbul ignore next */
                if (!authResult.length) {
                    throw new Error(response.statusText);
                }

                return await loadFromUri(odataConfig, authResult, false)
            }

            return await response.text();
        });
}

function loadFromFile(odataConfig: FileLocation, cwd: string, configFileLocation: string | null, warnings: SupressWarnings | null) {

    return new Promise<string>((res, rej) => {
        fs.readFile(getAbsolutePath(odataConfig, cwd, configFileLocation, warnings), (err, buffer) => {
            err ? rej(err) : res(buffer.toString());
        });
    });
}

function getAbsolutePath(odataConfig: FileLocation, cwd: string, configFileLocation: string | null, warnings: SupressWarnings | null): string {

    if (path.isAbsolute(odataConfig.path)) {
        return odataConfig.path
    }

    if (configFileLocation && !path.isAbsolute(configFileLocation)) {
        configFileLocation = path.join(cwd, configFileLocation)
    }

    const cwdPath = path.join(cwd, odataConfig.path)
    if (!configFileLocation) {
        return cwdPath
    }

    const configPath = path.join(path.dirname(configFileLocation), odataConfig.path)
    if (fs.existsSync(cwdPath) && fs.existsSync(configPath)) {
        warn(warnings, "supressAmbiguousFileLocation", `Found 2 possible $metadata files: ${cwdPath} + ${configPath}.\nUsing ${configPath}`);
    }

    return configPath
}