import { generateTypescriptFile } from "./codeGenApp.js";

export async function executeCodeGen(args: string[]) {
    // TODO: more configurable args
    if (args.length !== 2) {
        exn();
    }

    // TODO: default config location
    if (args[0] !== "--config") {
        exn();
    }

    const then = new Date();
    console.log("Generating code...");
    await generateTypescriptFile(args[1])
    console.log(`Complete in ${new Date().getTime() - then.getTime()}ms`);

    console.log();

    function exn() {
        throw new Error("1 argument required: --config {{config file location}}");
    }
}