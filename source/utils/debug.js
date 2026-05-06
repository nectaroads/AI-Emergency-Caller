const path = require('path');
const { handleRequest } = require('../express/express');
const { print } = require('./io');

const test = {
    peu: (target) => {
        const audioFile = target ? target : "socorro_gato.ogg";
        const req = {
            body: {
                text: null,
                audio: audioFile,
                lat: -12.978299,
                lon: -39.248689,
                time: "2026-04-30T02:27:00-03:00"
            }
        };
        return { audioFile, req }
    },
    lay: (target) => {
        const audioFile = target ? target : "teste_lay.ogg";
        const req = {
            body: {
                text: null,
                audio: audioFile,
                lat: -21.749893,
                lon: -48.847757,
                time: "2026-05-01T20:35:00-03:00"
            }
        };
        return { audioFile, req }
    }
}

function test1() {

}

function sendDebugAudioMessage(target) {
    print(`[Log] Debug: Request: Sending placeholder audio...`);
    const { audioFile, req } = test["peu"]();
    handleRequest(req, null, "help");
}

module.exports = { sendDebugAudioMessage }