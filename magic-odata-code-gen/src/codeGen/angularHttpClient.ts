import { ODataServiceConfig } from "magic-odata-shared";
import { AngularHttpResultType, CodeGenConfig } from "../config.js";
import { httpClient } from "./httpClient.js";
import { Keywords } from "./keywords.js";
import { angularResultType, Tab } from "./utils.js";

function parseAngularBlob(keywords: Keywords, tab: Tab) {
  return `function ${keywords.parseAngularBlob}(blob: ${keywords.AngularHttpResponse}<Blob> | null | undefined): ${keywords.Observable}<${keywords.AngularHttpResponse}<string> | null> {
${tab(`return new ${keywords.Observable}<${keywords.AngularHttpResponse}<string> | null>(observer => {
${tab(`if (!blob || !blob.body) {
${tab(`observer.next(null);
observer.complete();`)}
} else {
${tab(`const reader = new FileReader();
reader.onload = event => {
${tab(`if (!event.target?.result) {
${tab(`observer.next(blob.clone<string>({ body: null }));`)}
} else if (typeof event.target.result === "string") {
${tab(`observer.next(blob.clone({ body: event.target.result }));`)}
} else {
${tab(`throw new ${keywords.HttpError}("Error processing array buffer", event.target.result)`)}
}

observer.complete();`)}
};

reader.readAsText(blob.body);`)}
}`)}
});`)}
}`
}

function parseAngularArrayBuffer(keywords: Keywords, tab: Tab) {
  return `function ${keywords.parseAngularArrayBuffer}(x: ${keywords.AngularHttpResponse}<ArrayBuffer> | null | undefined) {
${tab(`return (x && x.clone({ body: x.body && new Blob([x.body], { type: 'text/plain' }) })) || null`)}
}`
}

function parseAngularString(keywords: Keywords, tab: Tab) {
  return `function ${keywords.parseAngularString}(x: ${keywords.AngularHttpResponse}<string> | null | undefined, options: ${keywords.RequestOptions}, parseString: (string: string, contentType?: string) => any) {
${tab(`if (!x || x.body == null) return null;

let contentType = x.headers?.get("Content-Type")
return parseString(x.body, contentType || undefined)`)}
}`
}

function parseResponseFunctionBody(keywords: Keywords, resultType: AngularHttpResultType, tab: Tab) {

  const mappers = [
    resultType === AngularHttpResultType.ArrayBuffer ? `${keywords.map}(${keywords.parseAngularArrayBuffer})` : null,
    resultType !== AngularHttpResultType.String ? `${keywords.mergeMap}(${keywords.parseAngularBlob})` : null,
    `${keywords.map}(x => ${keywords.parseAngularString}(x, options, parseString))`
  ].filter(x => !!x)
    .join(",\n")

  return `return response.pipe(
${tab(mappers)})`;
}

export function angularHttpClient(
  serviceConfig: ODataServiceConfig,
  tab: Tab,
  keywords: Keywords,
  settings: CodeGenConfig | null) {

  const responseType = settings?.angularMode == null || settings.angularMode === false
    ? null
    : settings.angularMode === true
      ? AngularHttpResultType.String
      : settings.angularMode.httpResultType;

  /* istanbul ignore next */
  if (responseType === null) {
    throw new Error("Invalid angular configuration");
  }

  const body = parseResponseFunctionBody(keywords, responseType, tab)

  return [
    responseType === AngularHttpResultType.ArrayBuffer
      ? parseAngularArrayBuffer(keywords, tab)
      : null,
    responseType === AngularHttpResultType.Blob || responseType === AngularHttpResultType.ArrayBuffer
      ? parseAngularBlob(keywords, tab)
      : null,
    parseAngularString(keywords, tab),
    httpClient(
      serviceConfig, tab, keywords,
      [`${keywords.Observable}<${keywords.AngularHttpResponse}<${angularResultType(settings)}>>`, `${keywords.Observable}<any>`],
      body, settings)
  ]
    .filter(x => !!x)
    .join("\n\n")
}