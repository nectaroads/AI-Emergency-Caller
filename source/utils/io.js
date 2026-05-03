const fs = require('fs');
const path = require('path');

// So, I kinda like formatted logging, it's easier to understand.
// Also, it'll automatically log the prints and index em' by day.
// It may not work on all environments, sadly...

function getPath(dir) {
    if (!dir) return print(`[Warn] System: Missing required fields`);
    const result = path.join(__dirname, '.' + dir);
    return result;
}

function setPath(dir) {
    if (!dir) return print(`[Warn] System: Missing required fields`);
    let result = getPath(dir);
    if (!fs.existsSync(result)) {
        fs.mkdirSync(result, { recursive: true });
        print(`[Log] fs: Path created: ${result}`);
        result = getPath(dir);
    }
    return result;
}

function getFile(dir) {
    const result = getPath(dir);
    return result;
}

function setFile(dir) {
    if (!dir) return print(`[Warn] System: Missing required fields`);
    let result = getFile(dir);
    const folderRelative = path.dirname(dir);
    setPath(folderRelative);
    if (!fs.existsSync(result)) {
        fs.writeFileSync(result, '');
        print(`[Log] fs: File created: ${result}`);
        result = getFile(dir);
    }
    return result;
}

function log(file, value, wipe = false) {
    if (!file || !value) return print(`[Warn] System: Missing required fields`);
    const filePath = setFile(`./logs/${file}`);
    if (!wipe) fs.appendFile(filePath, value + '\n', () => { });
    else fs.writeFile(filePath, value + '\n', () => { });
}

function print(value, result = false) {
    if (!value) value = "[empty entry]";
    const tags = { '[Request]': '\x1b[34m', '[Log]': '\x1b[90m', '[Success]': '\x1b[32m', '[Error]': '\x1b[31m', '[Warn]': '\x1b[33m', '[Database]': '\x1b[36m', '[Setup]': '\x1b[35m' };
    const blocks = { '[Request]': '\x1b[44m', '[Log]': '\x1b[100m', '[Success]': '\x1b[42m', '[Error]': '\x1b[41m', '[Warn]': '\x1b[43m', '[Database]': '\x1b[46m', '[Setup]': '\x1b[45m' };
    const specials = { value: '\x1b[2m', reset: '\x1b[0m', gray: '\x1b[90m' };
    let formattedString = '';
    let formatIndex = 0;
    for (const word of value.split(' ')) {
        if (tags[`${word}`]) formattedString += `${blocks[word]}  ${specials.reset} ${tags[word]}${word}${specials.reset} `;
        else if (word.endsWith(':')) {
            formattedString += `${word} ${formatIndex == 0 ? specials.value : '\x1b[94m'}`;
            formatIndex += 1;
        } else formattedString += `${word} `;
    }
    console.log(formattedString + specials.reset);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    log(`./${year}${month}${day}.txt`, value);
    return result;
}

module.exports = { getPath, setPath, getFile, setFile, log, print }