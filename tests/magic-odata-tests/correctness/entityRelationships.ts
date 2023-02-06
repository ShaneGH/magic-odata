import { registerTest, verifyCorrectness } from "./utils.js";


const blocks = [
    ["Complex", "Complex"],
    ["Complex", "Simple"],
    ["Complex", "Array<Complex>"],
    ["Complex", "Array<Simple>"],
    ["Simple", "Simple"], // $it
    ["Array<Complex>", "Complex"],
    ["Array<Simple>", "Simple"],
    ["Array<Simple>", "HasSubset"]
    // ["Complex", "Array<Array<Complex>>"],
    // ["Complex", "Array<Array<Simple>>"],
    // ["Array<Array<Simple>>", "Array<Simple>"],
    // ["Array<Array<Complex>>", "Array<Complex>"]
];

export function entityResults() {
    return {
        original: blocks.map(x => x.join(" -> ")),
        uniqueResults: uniqueResults.slice()
    };
}

export function print() {

    console.log(`Original (${blocks.length})`);
    console.log(blocks.map(x => x.join(" -> ")));

    console.log();
    console.log(`Expanded x 3 (${uniqueResults.length})`);
    console.log(uniqueResults);
}

const entityRelationships = "EntityRelationships";
export function describeEntityRelationship(name: string, test: () => void) {
    return registerTest(entityRelationships, name, test);
}

export function verifyEntityRelationships() {

    return verifyCorrectness(entityRelationships, done => {
        return entityResults().uniqueResults
            .filter(x => done.indexOf(x) === -1);
    });
}

const result = addExtraPieces(blocks, 4)
    .filter(inputsCorrect)
    .filter(outputsCorrect)
    .filter(notRedundantSimpleSimple)
    .filter(max2InARow);

function addExtraPieces(blocks: string[][], pieces: number): string[][] {
    if (pieces <= 0) return blocks;

    return addExtraPieces(blocks.reduce(addExtraPiece, []), pieces - 1);
}

const uniqueResultKeys = result
    .map(x => x.join(" -> "))
    .reduce((s, x) => s[x] ? s : { ...s, [x]: true }, {} as { [k: string]: boolean });

const uniqueResults = Object
    .keys(uniqueResultKeys)
    .sort();

function addExtraPiece(s: string[][], block: string[]) {
    const next = blocks
        .filter(b => b[0] === block[block.length - 1])
        .map(b => block.concat(b.slice(1)));

    return [
        ...s,
        block,
        ...next
    ]
}

function inputsCorrect(vals: string[]) {
    return vals[0] === "Complex" || vals[0] === "Simple"
}

function outputsCorrect(vals: string[]) {
    return vals[vals.length - 1] === "Simple" || vals[vals.length - 1] === "HasSubset"
}

function maxXInARow<T>(vals: T[], maxInARow: number, ...specificValues: T[]) {

    if (maxInARow < 1) throw new Error();

    for (let i = maxInARow; i < vals.length; i++) {

        if (specificValues.length && specificValues.indexOf(vals[i]) === -1) {
            continue;
        }

        const matches = [...Array(maxInARow).keys()]
            .map(x => x + 1)
            .filter(offset => vals[i] === vals[i - offset]);

        if (matches.length === maxInARow) {
            return false;
        }
    }

    return true;
}

function max2InARow<T>(vals: T[]) {
    return maxXInARow(vals, 2);
}

function notRedundantSimpleSimple(vals: string[]) {
    if (vals.length < 3) {
        return true;
    }

    return maxXInARow(vals, 1, "Simple");
}