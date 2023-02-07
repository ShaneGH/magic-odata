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

// https://github.com/ShaneGH/magic-odata/issues/11
executeCodeGen(process.argv.slice(0));