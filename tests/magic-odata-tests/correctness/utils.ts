

const register: { [k: string]: string[] } = {};
export function registerTest(correctnessKey: string, name: string, test: () => void) {
    register[correctnessKey] ??= [];

    register[correctnessKey].push(name)
    return describe(name, test);
}

export function verifyCorrectness(correctnessKey: string, assert: (done: string[]) => string[], doExpect = true) {
    const missing = assert(register[correctnessKey] || []);

    if (doExpect) {
        expect(missing).toEqual([]);
    }

    return missing;
}