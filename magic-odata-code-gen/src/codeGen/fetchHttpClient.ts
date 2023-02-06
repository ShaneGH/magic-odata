import { ODataServiceConfig } from "magic-odata-shared";
import { CodeGenConfig, SupressWarnings } from "../config.js";
import { httpClient } from "./httpClient.js";
import { Keywords } from "./keywords.js";
import { Tab } from "./utils.js";

export function fetchHttpClient(
    serviceConfig: ODataServiceConfig,
    tab: Tab,
    keywords: Keywords,
    settings: CodeGenConfig | null | undefined,
    warnings: SupressWarnings | null | undefined) {


    const parseResponseFunctionBody = `return response
${tab(`.then(response => {
${tab(`if (!response.ok) {
${tab(`throw new ${keywords.HttpError}("Error executing http request", response)`)}
}

return response.json();`)}
})`)}`

    return httpClient(serviceConfig, tab, keywords, ["Promise<Response>", "Promise<any>"], parseResponseFunctionBody, settings, warnings)
}