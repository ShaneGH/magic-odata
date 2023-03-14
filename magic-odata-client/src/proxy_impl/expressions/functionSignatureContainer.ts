
import { describeSignature, FunctionSignature } from "./functionSignatures.js";

function rootSig(signature: FunctionSignature): FunctionSignature {
    return signature.constructedFrom
        ? rootSig(signature.constructedFrom)
        : signature
}

export class FunctionSignatureContainer {
    public readonly name: string;

    constructor(public readonly signatures: FunctionSignature[]) {

        const names = signatures
            .reduce(
                (s, x) => s.indexOf(x.name) === -1 ? [...s, x.name] : s,
                [] as string[])

        if (names.length === 0) {
            throw new Error("A signature must have at least one implementation")
        }

        if (names.length > 1) {
            throw new Error(`A signature may only have a single name: ${names.join(", ")}`)
        }

        this.name = names[0]
    }

    describe(root: boolean) {
        return this.signatures
            .map(x => describeSignature(x, root))
            .reduce((s, x) => s.indexOf(x) === -1 ? [...s, x] : s, [] as string[])
    }
}