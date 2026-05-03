const { startExpress } = require("./source/express/express");
const { sendDebugAudioMessage } = require("./source/utils/debug");
const { print } = require("./source/utils/io");
const { debug } = require('./source/utils/constants');

async function main() {
    console.clear();
    print(`[Setup] Main module: Starting core systems: Please, wait...`);
    await startExpress();
    if (!debug) return;
    sendDebugAudioMessage();
}

main();