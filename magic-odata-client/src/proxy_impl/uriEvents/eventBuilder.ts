

export const recordedType = Symbol("recordedType")
export type Recorded =
    | { [recordedType]: "Get", data: string }
    | { [recordedType]: "Apply", data: { thisArg: any, argArray: any[] } }

export const recorded = Symbol("recorded")
export const root = Symbol("root")
export const rootName = Symbol("rootName")

export type Recorder = {
    [root]: symbol
    [rootName]: string | undefined
    [recorded]: Recorded[]
}

function _buildRecorderObj(rootSymbol: symbol, _rootName: string | undefined, r: Recorded[]) {
    // needs to be a function so that proxy apply works
    const result = (function () { }) as any as Recorder
    result[recorded] = r
    result[root] = rootSymbol
    result[rootName] = _rootName
    return result
}

function _buildRecorder(setupValues: [symbol, string | undefined] | Recorder): Recorder {

    const [[rootSymbol, _rootName], previous] = Array.isArray(setupValues)
        ? [setupValues, _buildRecorderObj(setupValues[0], setupValues[1], [])]
        : [[setupValues[root], setupValues[rootName]] as [symbol, string | undefined], setupValues]

    return new Proxy<Recorder>(previous, {
        get(target: Recorder, p: string | symbol, receiver: any): any {

            if (p === root) return target[root]
            if (p === rootName) return target[rootName]
            if (p === recorded) return target[recorded]

            if (typeof p === "symbol") return undefined

            return _buildRecorder(
                _buildRecorderObj(rootSymbol, _rootName, previous[recorded].concat([
                    { [recordedType]: "Get", data: p }
                ])))
        },

        apply(target: Recorder, thisArg: any, argArray: any[]) {

            return _buildRecorder(
                _buildRecorderObj(rootSymbol, _rootName, previous[recorded].concat([
                    { [recordedType]: "Apply", data: { thisArg, argArray } }
                ])))
        }
    })
}

export function buildRecorder(root: symbol, rootName?: string): Recorder {

    return _buildRecorder([root, rootName]);
}

export function isRecorder(x: any): x is Recorder {
    return x && !!x[recorded]
}

export function isRecorderArray(x: any): x is Recorder[] {
    return !Array.isArray(x)
        ? false
        : x.reduce((s, x) => s && isRecorder(x), true)
}

export function isRecorded(x: any): x is Recorded[] {
    if (!Array.isArray(x)) {
        return false
    }

    for (let i = 0; i < x.length; i++) {
        if (!x[i] || !x[i][recordedType]) return false
    }

    return true
}