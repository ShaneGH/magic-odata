import { parseArgs } from "./cmd/argParser.js";
import { generateTypescriptFile } from "./codeGenApp.js";

export async function executeCodeGen(args: string[]) {

    const parsedArgs = parseArgs(args)
    if (typeof parsedArgs === "number") {
        process.exit(parsedArgs)
    }

    const then = new Date();
    console.log("Generating code...");
    await generateTypescriptFile(parsedArgs)
    console.log(`Complete in ${new Date().getTime() - then.getTime()}ms`);

    console.log();
}