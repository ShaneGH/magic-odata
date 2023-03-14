import { ODataEntitySet } from "../../../index.js"
import { Recorder } from "./eventBuilder.js"

export type Key =
    | { type: "PathSegment", data: { keyData: any } }
    | { type: "FunctionCall", data: { keyData: any } }
    | { type: "Raw", data: string }

export type Path =
    | { type: "EntitySetName", data: ODataEntitySet }
    | { type: "Key", data: Key }
    | { type: "PropertyName", data: string }
    | { type: "$count" }
    | { type: "$value" }
    | { type: "Cast", data: string }

export type UriPart =
    | { type: "Path", data: Path }
    | { type: "EntityContainerName", data: string }
    | { type: "Query", data: Recorder[] }

export class UriPartStream {
    static readonly zero = new UriPartStream([])

    constructor(public readonly parts: UriPart[]) { }

    concat(other: UriPartStream) {
        if (this === UriPartStream.zero) return other
        if (other === UriPartStream.zero) return this

        return new UriPartStream(this.parts.concat(other.parts))
    }
}