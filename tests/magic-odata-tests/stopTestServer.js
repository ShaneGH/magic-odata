import path from "path";
import { fileURLToPath } from "url";
import { get } from "http";
import { settings } from "./testSettings.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = `http://localhost:${settings.testServerPort}`

kill();

function kill() {
    return new Promise((res, rej) => {
        try {
            get(`${server}/kill`, ({ statusCode }) => {
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