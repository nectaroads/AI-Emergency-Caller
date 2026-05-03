const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
const { dotenv } = require("./constants");
const { print } = require("./io");

const openai = new OpenAI({ apiKey: dotenv.OPENAIKEY });

async function transcribeAudio(target) {
    try {
        const audioPath = path.join(__dirname, "..", "assets", "audios", target);
        const transcription = await openai.audio.transcriptions.create({
            model: "gpt-4o-mini-transcribe",
            file: fs.createReadStream(audioPath),
            language: "pt"
        });
        return transcription.text;
    } catch (error) {
        print("[Warn] GPT: Transcription: " + error);
        return null;
    }
}

function cleanJSON(raw) {
    return raw.replace(/```json/g, "").replace(/```/g, "").trim();
}

function parseAIJson(raw) {
    const cleaned = cleanJSON(raw);
    return JSON.parse(cleaned);
}

const getPrompt = {
    system: () => {
        const prompt = `
You are an emergency assistance routing agent.

Your task is to analyze the user's situation, location, and current time, then identify the most appropriate emergency or public service unit responsible for handling the case.

You must prioritize accurate local routing. When needed, use web search to verify current phone numbers, responsible agencies, opening hours, service jurisdiction, and whether the unit is currently available.

Decision rules:
- Identify the emergency context from the user's message.
- Determine whether the case belongs to a municipal, state, or federal authority.
- Prefer the closest competent unit that is open or available at the current time.
- Never recommend a unit that is closed at the current time.
- If the situation is urgent and no local unit is clearly available, recommend the appropriate emergency hotline.
- Differentiate local municipal services from federal services when jurisdiction matters.
- For Brazil, consider common emergency numbers such as SAMU 192, Military Police 190, Fire Department 193, Civil Police 197, Federal Police 194, and Federal Highway Police 191 when applicable.
- Do not invent phone numbers, addresses, or opening hours.
- If web search cannot confirm a specific local number, use a known official emergency number instead.
- Keep the answer practical and focused on action.

Return ONLY a JSON.
Return ONLY valid JSON.
NEVER use Markdown.
NEVER include explanations outside the JSON.

REQUIRED JSON format:
{
  "unity_name": "Name of the responsible unit or service",
  "phone_number": "Phone number to call",
  "emergency_context": "Brief explanation of why this unit/service is appropriate"
}
`;
        return prompt.trim();
    },

    assistant: (location, time) => {
        const prompt = `
The user is currently located at:

${JSON.stringify(location, null, 2)}

The current local time is:

${time}

Use this location and time to determine the correct responsible emergency or public service unit.
`;
        return prompt.trim();
    }
};

const requestAI = {
    GPT: async (system, assistant, user) => {
        try {
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + process.env.OPENAIKEY
                },
                body: JSON.stringify({
                    model: "gpt-4.1",
                    input: [
                        { role: "system", content: system },
                        { role: "assistant", content: assistant },
                        { role: "user", content: user }
                    ],
                    tools: [{ type: "web_search" }]
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(data));

            const message = data.output?.find(o => o.type === "message");
            if (!message) throw new Error("No message in response: " + JSON.stringify(data));

            const content = message.content?.find(c => c.type === "output_text");
            if (!content || !content.text) throw new Error("No text content: " + JSON.stringify(message));

            const raw = content.text;
            const parsed = parseAIJson(raw);
            return { ok: true, data: parsed };
        } catch (err) {
            return { ok: false, error: "GPT_FAIL", detail: err.message };
        }
    },

    GROK: async (system, assistant, user) => {
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + process.env.GROKKEY
                },
                body: JSON.stringify({
                    model: "grok-4.3",
                    messages: [
                        { role: "system", content: system },
                        { role: "assistant", content: assistant },
                        { role: "user", content: user }
                    ]
                })
            });
            const data = await response.json();
            if (!data.ok) throw new Error(JSON.stringify(data));
            const raw = data.choices[0].message.content;
            const cleaned = raw.replace(/```json|```/g, "").trim();
            const parsed = parseAIJson(cleaned);
            return { ok: true, data: parsed };
        } catch (err) {
            return { ok: false, error: "GROK_FAIL", detail: err.message };
        }
    }
}

function extractLocation(data) {
    const components = data.results[0].address_components;

    let street = null;
    let neighborhood = null;
    let city = null;
    let state = null;
    let country = null;
    let zip = null;

    for (const comp of components) {
        const types = comp.types;
        if (types.includes("route")) street = comp.long_name;
        if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) neighborhood = comp.long_name;
        if (types.includes("administrative_area_level_2")) city = comp.long_name;
        if (types.includes("administrative_area_level_1")) state = comp.long_name;
        if (types.includes("country")) country = comp.long_name;
        if (types.includes("postal_code")) zip = comp.long_name;
    }

    return { street, neighborhood, city, state, country, zip };
}

async function getLocation(lat, lon) {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${dotenv.GOOGLEKEY}`);
    const data = await res.json();
    return extractLocation(data);
}

module.exports = { transcribeAudio, getLocation, requestAI, getPrompt }