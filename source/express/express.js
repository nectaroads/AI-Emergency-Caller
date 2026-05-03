const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const { print } = require('../utils/io');
const { dotenv } = require('../utils/constants');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: false, maxAge: 86400 }));

const eventHandlers = {};
const eventHandlersDir = path.join(__dirname, './events');

// On these three functions I'm creating events automatically using ./events exports.
// So I just need to make a new .js there, it's indexed by endpoint, by the way.

fs.readdirSync(eventHandlersDir).forEach(file => {
    if (file.endsWith('.js')) {
        const key = path.basename(file, '.js');
        eventHandlers[key] = require(path.join(eventHandlersDir, file));
    }
});

function handleRequest(req, res, event) {
    const address = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || "Debug";
    print(`[Request] Express: Web request by: ${address}`);

    if (!req.body) {
        res?.status(400).json({ error: 'Missing body' });
        return;
    }

    res?.setHeader('Content-Type', 'application/json; charset=utf-8');
    print(`[Log] Express: Handling request: ${event}`);
    const handler = eventHandlers[event];
    if (handler) handler(req, res);
    return;
}

function setupEvents() {
    for (const event in eventHandlers) {
        print(`[Setup] Express: Event created: ${event}`);
        app.post(`/${event}`, (req, res) => {
            handleRequest(req, res, event);
        });
    }
}

async function startExpress(port = null) {
    setupEvents();
    const listenPort = port || dotenv.EXPRESSPORT;
    print(`[Setup] Express: Starting server...`);
    return new Promise((resolve, reject) => {
        app.listen(listenPort, '0.0.0.0', error => {
            if (error) return reject(error);
            print(`[Setup] Express: Listening on: ${listenPort}`);
            resolve();
        });
    }).catch(error => {
        print(`[Error] Express: ${error}`);
    });
}

module.exports = { startExpress, handleRequest };