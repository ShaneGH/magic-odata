import { executeComandLine } from "./src/codeGenCmd.js";

export { executeCodeGen } from "./src/codeGenCmd.js";

export {
    generateCode,
    generateTypescriptFile
} from "./src/codeGenApp.js";

export {
    LocationType,
    FileLocation,
    UriLocation,
    XmlString,
    XmlLocation
} from "./src/odataConfigLoader.js";

const args = process.argv.slice(0)

// do not run as a command line app for unit test runs
const jestTools = [
    /node_modules\/jest\/bin\/jest\.js$/,
    /node_modules\\jest-worker\\build\\workers\\processChild.js$/
]

const isUnitTest = !!args.find(x => x && jestTools.find(jt => jt.test(x)))
if (!isUnitTest) {

    // https://github.com/ShaneGH/magic-odata/issues/11
    executeComandLine(args);
}