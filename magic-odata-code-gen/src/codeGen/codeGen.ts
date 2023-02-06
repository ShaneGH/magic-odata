
import { ODataServiceConfig } from "magic-odata-shared";
import { AsyncType, CodeGenConfig, SupressWarnings } from "../config.js";
import { angularHttpClient } from "./angularHttpClient.js";
import { edm } from "./edm.js";
import { ProcessedNamespace, ProcessedServiceConfig, processServiceConfig } from "./entities.js";
import { fetchHttpClient } from "./fetchHttpClient.js";
import { httpClient } from "./httpClient.js";
import { generateKeywords, imports } from "./keywords.js";
import { buildTab, configObj, lintingAndComments } from "./utils.js";

export function codeGen(serviceConfig: ODataServiceConfig, settings: CodeGenConfig | null | undefined, warnings: SupressWarnings | null | undefined) {

    if (settings != null && settings.angularMode && settings.asyncType && settings.asyncType !== AsyncType.RxJs) {
        throw new Error('If angularMode is configured, asyncType must be either null or "Rxjs"');
    }

    const keywords = generateKeywords(Object.keys(serviceConfig.types), Object.keys(serviceConfig.types[""] || {}));
    const tab = buildTab(settings)
    const client = settings?.angularMode ? angularHttpClient : fetchHttpClient

    // TODO: make module composition a bit nicer "module X { module Y { module Z { ..."
    const output = `
${imports(keywords, tab, settings || null)}

${lintingAndComments()}

${client(serviceConfig, tab, keywords, settings || null, warnings)}

${entities()}

${configObj(serviceConfig, keywords, settings, tab)}

${edm(tab)}`

    return output
        .replace(/\r\n/g, "\n")
        .replace(/s+\n/g, "\n") + "\n";

    function splitConfig(config: ProcessedServiceConfig): [ProcessedServiceConfig, ProcessedServiceConfig] {
        // return config;

        // TODO: good idea. Will allow us to export types for actual data, but keep 
        // non data types local. But some module reference issues
        return Object
            .keys(config)
            .reduce((s, x) => [
                {
                    ...s[0],
                    [x]: removeUtils(config[x])
                },
                {
                    ...s[1],
                    [x]: removeNonUtils(config[x])
                }
            ] as [ProcessedServiceConfig, ProcessedServiceConfig], [{}, {}] as [ProcessedServiceConfig, ProcessedServiceConfig])

        function removeUtils(ns: ProcessedNamespace): ProcessedNamespace {
            return Object
                .keys(ns)
                .reduce((s, x) => ({
                    ...s,
                    [x]: {
                        data: ns[x].data,
                        caster: null,
                        subPath: null,
                        query: null,
                        keyBuilder: null
                    }
                }), {} as ProcessedNamespace);
        }

        function removeNonUtils(ns: ProcessedNamespace): ProcessedNamespace {
            return Object
                .keys(ns)
                .reduce((s, x) => ({
                    ...s,
                    [x]: {
                        data: null,
                        caster: ns[x].caster,
                        subPath: ns[x].subPath,
                        query: ns[x].query,
                        keyBuilder: ns[x].keyBuilder
                    }
                }), {} as ProcessedNamespace);
        }
    }

    function entities() {
        const [data, utils] = splitConfig(
            processServiceConfig(settings, tab, keywords, serviceConfig, warnings))

        return `/**
 * Entities and complex types from the data model
 */
${buildModule(data)}

/**
 * Helper types for static typing of OData uris.
 */
${buildModule(utils)}`

        function buildModule(result: ProcessedServiceConfig) {
            return Object
                .keys(result)
                .map(x => x
                    ? `export module ${x} {\n${tab(processModule(result[x]))}\n}`
                    // TODO: test this case (with namespace == "")
                    : processModule(result[x]))
                .join("\n\n");
        }

        function processModule(module: ProcessedNamespace) {
            return Object
                .keys(module)
                .map(name => [
                    module[name].data,
                    module[name].query,
                    module[name].caster,
                    module[name].subPath,
                    module[name].keyBuilder
                ]
                    .filter(x => x)
                    .join("\n\n"))
                .join("\n\n")
        }

    }
}
