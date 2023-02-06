import * as path from "path";
import { fileURLToPath } from "url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: default config file name
// TODO: verify the magic-odata-client version is the same as this version
// TODO: process.argv.slice(2) might be incorrect. e.g. node --experimental-vm-modules index.js --config my-config.js
executeCodeGen(process.argv.slice(2));