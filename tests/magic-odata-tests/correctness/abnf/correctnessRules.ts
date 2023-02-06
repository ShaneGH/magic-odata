
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerTest, verifyCorrectness } from "../utils.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = fs.readFileSync(__dirname.replace("\\dist", "") + "\\rules.txt").toString();

type RuleAccumulator = { current: null | string, accumulator: { [r: string]: string } }

const rules = buildRules();

export function getRules() {
    return { ...rules }
}

const correctness = "ABNF";
export function describeAbnf(name: string, test: () => void) {
    return registerTest(correctness, name, test);
}

export function verifyAbnf() {

    return verifyCorrectness(correctness, done => {
        return Object.keys(getRules())
            .filter(x => done.indexOf(x) === -1);
    });
}

// export function satisfiesRule(test: string, rule: string) {
//     if (!rules[rule]) {
//         throw new Error(`Invalid rule ${rule}`);
//     }

//     if (rules[rule] === test) {
//         return true;
//     }

//     if ()
// }

// console.log(Object.keys(rulesAcc).length)
console.log(getRules())

function buildRules() {
    const rulesAcc = file
        .split(/\r?\n/)
        // reversing will allow rollup of multiple line statements
        .reverse()
        .reduce(reduceLines, { current: null, accumulator: {} } as RuleAccumulator);

    if (rulesAcc.current !== null) {
        throw new Error(`Floating rule: ${rulesAcc.current}`)
    }

    return rulesAcc.accumulator;
}

function reduceLines(s: RuleAccumulator, x: string) {
    // remove comments
    const colon = x.indexOf(";");
    x = colon === -1 ? x : x.substring(0, colon);

    x = trim(x);

    if (!x) {
        return s;
    }

    if (s.current) {
        x = `${x} ${s.current}`
    }

    const keyValue = splitEq(x);
    if (!keyValue.length || keyValue.length > 2) {
        throw new Error(`Parse error: ${x}`);
    }

    if (keyValue.length === 2 && s.accumulator[keyValue[0]]) {
        throw new Error(`Duplicate key: ${keyValue[0]}`);
    }

    return keyValue.length === 2
        ? {
            current: null,
            accumulator: {
                ...s.accumulator,
                [keyValue[0].replace(/\s+/g, " ")]: keyValue[1].replace(/\s+/g, " ")
            }
        }
        : {
            current: x,
            accumulator: s.accumulator
        }
}

function splitEq(input: string) {
    if (input.indexOf("=") === -1) {
        return [input];
    }

    if (input.indexOf("'") === -1 && input.indexOf('"') === -1) {
        return input.split(/\s*=\s*/g);
    }

    const split = reduceStr(input, (s, x) => {

        let single = s["'"];
        let double = s['"'];

        if (x === "'") {
            single = !single;
        } else if (x === '"') {
            double = !double;
        } else if (x === '=' && !single && !double) {
            return {
                ...s,
                accumulator: [
                    ...s.accumulator,
                    ""
                ]
            }
        }

        return {
            "'": single,
            '"': double,
            accumulator: [
                ...s.accumulator.slice(0, s.accumulator.length - 1),
                s.accumulator[s.accumulator.length - 1] + x
            ]
        }

    }, { accumulator: [""], "'": false, '"': false });

    return split.accumulator.map(trim);
}

function trim(input: string) {
    return input.replace(/(^\s+)|(\s+$)/g, "");
}

function reduceStr<T>(input: string, reducer: (s: T, x: string) => T, initial: T): T {
    for (let i = 0; i < input.length; i++) {
        initial = reducer(initial, input[i]);
    }

    return initial;
}