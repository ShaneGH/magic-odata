
import { spawn } from "child_process"
import path from "path";
import { fileURLToPath } from "url";
import { openSync, existsSync, mkdirSync } from "fs";
import { get } from "http";
import { settings } from "./testSettings.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = "./dist";
if (!existsSync(distDir)) {
    mkdirSync(distDir);
}

const logDir = `${distDir}/logs`;
if (!existsSync(logDir)) {
    mkdirSync(logDir);
}

var out = openSync(`${logDir}/out.log`, 'a');
var err = openSync(`${logDir}/out.log`, 'a');

const server = `http://localhost:${settings.testServerPort}`

new Promise(async (res, rej) => {
    try {
        await ping();
        res("Server is aready up")
        return;
    } catch {
    }

    console.log("Spawning new server")
    const child = spawn("dotnet", [
        "run",
        "--project", "../TestServer/TestServer.csproj",
        `--urls=${server}/`], {
        shell: true,
        detached: true,
        stdio: ['ignore', out, err]
    });

    child.unref();

    await wait(4000);
    for (var i = 0; i < 30; i++) {
        if (i !== 0) {
            await wait(500);
        }

        try {
            await ping();
            res("Server up");
            return
        } catch {
        }
    }

    rej(new Error("Timed out"));
})
    .then(msg => console.log(msg))
    .catch(x => {
        console.error(x);
        if (!child.kill()) {
            console.error("Unable to kill test server. Please manually stop");
        }
    });

function wait(ms) {
    return new Promise(res => {
        setTimeout(res, ms);
    });
}

function ping() {
    return new Promise((res, rej) => {
        try {
            get(`${server}/ping`, ({ statusCode }) => {
                if (statusCode >= 200 && statusCode < 300) {
                    res(statusCode);
                    return;
                }

                rej(statusCode);
            }).on("error", rej);
        } catch {
            rej();
        }
    });
}