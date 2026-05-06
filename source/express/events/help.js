// This event triggers when the user send their location and asks for help.

const { print } = require("../../utils/io");
const { transcribeAudio, getLocation, requestAI, getPrompt } = require("../../utils/tools");

module.exports = async (req, res) => {
    const body = req.body;
    let user = body.text;

    if (!body.lat) {
        if (res) res.status(400).json({ success: false, reason: "Missing latitude" });
        return print(`[Warn] Process: No latitude found`);
    }

    if (!body.lon) {
        if (res) res.status(400).json({ success: false, reason: "Missing longitude" });
        return print(`[Warn] Process: No longitude found`);
    }

    const location = await getLocation(body.lat, body.lon);

    if (!location) {
        if (res) res.status(400).json({ success: false, reason: "Missing location" });
        return print(`[Warn] Process: No location found`);
    }

    if (body.audio) {
        print(`[Log] Process: Handling audio...`);
        user = await transcribeAudio(body.audio);
    }

    print(`[Log] Process: Creating prompts...`);
    const system = getPrompt["system"]();
    const assistant = getPrompt["assistant"](location, body.time);
    print(`[Log] Process: User prompt: ${user}`);

    async function getAIResponse() {
        for (const ai in requestAI) {
            print(`[Log] Process: Requesting AI: ${ai}`);
            const result = await requestAI[ai](system, assistant, user);
            if (result.ok) return result.data;
            print(`[Warn] Process: AI Error: ${result.detail}`);
        }
    }

    const result = await getAIResponse();

    if (!result) {
        if (res) res.status(400).json({ success: false, reason: "Invalid result, server error" });
        return print(`[Log] Process: Invalid result`);
    }

    print(`[Log] Process: Success!`);
    console.log(result);
}