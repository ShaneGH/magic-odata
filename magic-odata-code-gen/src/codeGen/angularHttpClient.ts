import { ODataServiceConfig } from "magic-odata-shared";
import { AngularHttpResultType, CodeGenConfig, SupressWarnings } from "../config.js";
import { httpClient } from "./httpClient.js";
import { Keywords } from "./keywords.js";
import { angularResultType, Tab } from "./utils.js";

function parseBlob(keywords: Keywords, tab: Tab) {
  return `function ${keywords.parseBlob}(blob: Blob | null | undefined): ${keywords.Observable}<string | null> {
${tab(`return new ${keywords.Observable}<string | null>(observer => {
${tab(`if (!blob) {
${tab(`observer.next(null);
observer.complete();`)}
} else {
${tab(`const reader = new FileReader();
reader.onload = event => {
${tab(`if (!event.target?.result) {
${tab(`observer.next("");`)}
} else if (typeof event.target.result === "string") {
${tab(`observer.next(event.target.result);`)}
} else {
${tab(`throw new ${keywords.HttpError}("Error processing array buffer", event.target.result)`)}
}

observer.complete();`)}
};

reader.readAsText(blob);`)}
} `)}   
});`)}
}`
}

function parseResponseFunctionBody(keywords: Keywords, resultType: AngularHttpResultType, tab: Tab) {

  if (resultType === AngularHttpResultType.String) {
    return `return response.pipe(${keywords.map}(x => x.body && JSON.parse(x.body)));`;
  }

  if (resultType === AngularHttpResultType.Blob) {
    return `return response.pipe(
${tab(`${keywords.map}(x => x && x.body),
${keywords.mergeMap}(${keywords.parseBlob}),
${keywords.map}(x => x && JSON.parse(x))`)});`;
  }

  if (resultType === AngularHttpResultType.ArrayBuffer) {
    return `return response.pipe(
${tab(`${keywords.map}(x => x && x.body),
${keywords.map}(x => x && new Blob([x],{type:'text/plain'})),
${keywords.mergeMap}(${keywords.parseBlob}),
${keywords.map}(x => x && JSON.parse(x))`)});`;
  }

  throw new Error("Invalid angular configuration");
}

export function angularHttpClient(
  serviceConfig: ODataServiceConfig,
  tab: Tab,
  keywords: Keywords,
  settings: CodeGenConfig | null,
  warnings: SupressWarnings | null | undefined) {

  const responseType = settings?.angularMode == null || settings.angularMode === false
    ? null
    : settings.angularMode === true
      ? AngularHttpResultType.String
      : settings.angularMode.httpResultType;

  if (responseType === null) {
    throw new Error("Invalid angular configuration");
  }

  const body = parseResponseFunctionBody(keywords, responseType, tab)

  return [
    responseType === AngularHttpResultType.Blob || responseType === AngularHttpResultType.ArrayBuffer ? parseBlob(keywords, tab) : null,
    httpClient(
      serviceConfig, tab, keywords,
      [`${keywords.Observable}<${keywords.AngularHttpResponse}<${angularResultType(settings)}>>`, `${keywords.Observable}<any>`],
      body, settings, warnings)
  ]
    .filter(x => !!x)
    .join("\n\n")
}