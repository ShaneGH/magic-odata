import { ODataTypeRef } from "../../../index.js";
import { Accept } from "../../entitySet/utils.js";
import { Reader, ReaderState } from "../../utils.js"
import { UriPart, UriPartStream } from "../uriEvents/uriPartStream.js"
import { mapPath } from "./path.js"
import { mapQuery } from "./query.js";
import { MappingUtils, UriRoughwork } from "./utils.js";

function executePathPart(part: UriPart, type: ODataTypeRef | null): ReaderState<MappingUtils, ODataTypeRef | null, UriRoughwork> {

    if (part.type === "EntityContainerName") {
        return ReaderState.create<MappingUtils, any, UriRoughwork>((env, s) => [
            null,
            {
                ...s,
                oDataUriParts: {
                    ...s.oDataUriParts,
                    entitySetContainerName: part.data
                }
            }
        ]);
    }

    if (part.type === "Query") {
        if (!type) {
            // TODO: audit all nulls and errors
            throw new Error("Unexpected error, expecting query type");
        }

        // TODO: type.collectionType is correct. Is ": type" correct also?
        return mapQuery(part.data, type.isCollection ? type.collectionType : type)
    }

    return mapPath(part.data, type)
}

function executePathParts(parts: UriPart[], type: ODataTypeRef | null): ReaderState<MappingUtils, UriPart[], UriRoughwork> {

    if (!parts.length) {
        return ReaderState.retn(parts)
    }

    return executePathPart(parts[0], type)
        .map(t => [t, parts.slice(1)] as [ODataTypeRef | null, UriPart[]])
        .bind(([t, x]) => executePathParts(x, t));
}

export function toUri(data: UriPartStream, uriRoot: string): Reader<MappingUtils, UriRoughwork> {
    const defaultVal: UriRoughwork = {
        accept: Accept.Json,
        paramMappings: [],
        oDataUriParts: {
            uriRoot,
            relativePath: "",
            query: {},
            entitySetContainerName: null,
            entitySetName: null
        }
    }

    return executePathParts(data.parts, null)
        .asReader(defaultVal)
        .map(x => x[1])
}