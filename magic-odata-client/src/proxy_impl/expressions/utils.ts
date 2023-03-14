import { ODataTypeRef } from "magic-odata-shared"

// TODO: move
// TODO: put in utils
const reservedTypeNamespace = `magic-odata`
export const magicODataTypeNamespace = `${reservedTypeNamespace}.types`
export const genericTypeNamespace = `${reservedTypeNamespace}.generics`
export const filterUtilsNamespace = `${reservedTypeNamespace}.filterUtils`

export function isGeneric(t: ODataTypeRef): boolean {
    if (t.isCollection) return isGeneric(t.collectionType)

    return t.namespace === genericTypeNamespace
}