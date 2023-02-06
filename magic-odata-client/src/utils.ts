
export function typeNameString(type: { name: string, namespace: string }, delimiter = "/") {
    return `${type.namespace && `${type.namespace}${delimiter}`}${type.name}`

}