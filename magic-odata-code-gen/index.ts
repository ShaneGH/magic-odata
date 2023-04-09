import { executeCodeGen } from "./src/codeGenCmd.js";

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

// https://github.com/ShaneGH/magic-odata/issues/11
executeCodeGen(process.argv.slice(0));