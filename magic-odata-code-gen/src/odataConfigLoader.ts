
import fetch, { RequestInit } from 'node-fetch'
import * as fs from 'fs'
import xmldom from 'xmldom'
import { Config } from './config.js';
const { DOMParser } = xmldom;

export enum LocationType {
    FileLocation = "FileLocation",
    UriLocation = "UriLocation",
    XmlString = "XmlString"
}
export type FileLocation = { path: string, type: LocationType.FileLocation }
export type UriLocation = { uri: string, buildRequest?: (req: RequestInit) => RequestInit, type: LocationType.UriLocation }
export type XmlString = { xml: string, type: LocationType.XmlString }
export type XmlLocation = FileLocation | UriLocation | XmlString

export async function loadConfig(config: Config, odataConfig: XmlLocation) {

    const stringResultP = odataConfig.type == LocationType.FileLocation
        ? loadFromFile(odataConfig)
        : odataConfig.type == LocationType.UriLocation
            ? loadFromUri(odataConfig)
            : new Promise<string>(res => res(odataConfig.xml));

    const stringResult = await stringResultP;
    if (config.printOData$metadata) {
        console.log(stringResult);
    }

    return new DOMParser().parseFromString(stringResult);
}

function loadFromUri(odataConfig: UriLocation) {

    return fetch(odataConfig.uri, odataConfig.buildRequest ? odataConfig.buildRequest({}) : {})
        .then(response => {
            if (response.status < 200 || response.status >= 300) {
                console.error(response);
                throw new Error(response.statusText);
            }

            return response.text();
        });
}

function loadFromFile(odataConfig: FileLocation) {

    return new Promise<string>((res, rej) => {
        fs.readFile(odataConfig.path, (err, buffer) => {
            err ? rej(err) : res(buffer.toString());
        });
    });
}