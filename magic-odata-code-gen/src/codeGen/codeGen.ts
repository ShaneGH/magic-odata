
import { ODataServiceConfig } from "magic-odata-shared";
import { AsyncType, CodeGenConfig, SupressWarnings } from "../config.js";
import { angularHttpClient } from "./angularHttpClient.js";
import { edm } from "./edm.js";
import { ProcessedNamespace, ProcessedServiceConfig, processServiceConfig } from "./entities.js";
import { entitySetFunctions } from "./entitySetFunctions.js";
import { fetchHttpClient } from "./fetchHttpClient.js";
import { generateKeywords, imports } from "./keywords.js";
import { buildSanitizeNamespace, buildTab, configObj, linting, comments } from "./utils.js";
import { unboundFunctions } from "./unboundFunctions.js"

export function codeGen(serviceConfig: ODataServiceConfig, settings: CodeGenConfig | null | undefined, warnings: SupressWarnings | null | undefined) {

    /* istanbul ignore next */
    if (settings != null && settings.angularMode && settings.asyncType && settings.asyncType !== AsyncType.RxJs) {
        throw new Error('If angularMode is configured, asyncType must be either null or "Rxjs"');
    }

    const sanitizeNamespace = buildSanitizeNamespace(settings)
    const keywords = generateKeywords(
        Object.keys(serviceConfig.schemaNamespaces),
        Object.keys(serviceConfig.schemaNamespaces[""]?.types || {}));
    const tab = buildTab(settings)
    const client = settings?.angularMode ? angularHttpClient : fetchHttpClient

    const output = `${linting()}

${imports(keywords, tab, settings || null)}

${comments()}

${client(serviceConfig, tab, keywords, settings || null)}

${entities()}

${entitySetFunctions(serviceConfig, keywords, settings, tab)}

${unboundFunctions(serviceConfig, keywords, settings, tab)}

${configObj(serviceConfig, keywords, settings, tab)}

${edm(tab, keywords)}`

    return output
        .replace(/\r\n/g, "\n")
        .replace(/\s+$/g, "\n") + "\n";

    function splitConfig(config: ProcessedServiceConfig): [ProcessedServiceConfig, ProcessedServiceConfig] {

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
                        functions: ns[x].functions,
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
                        functions: null,
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
                    ? `export module ${sanitizeNamespace(x)} {\n${tab(processModule(result[x]))}\n}`
                    : processModule(result[x]))
                .filter(x => !!x)
                .join("\n\n");
        }

        function processModule(module: ProcessedNamespace) {
            return Object
                .keys(module)
                .map(name => [
                    module[name].data,
                    module[name].functions,
                    module[name].query,
                    module[name].caster,
                    module[name].subPath,
                    module[name].keyBuilder
                ]
                    .filter(x => !!x)
                    .join("\n\n"))
                .filter(x => !!x)
                .join("\n\n")
        }

    }
}
