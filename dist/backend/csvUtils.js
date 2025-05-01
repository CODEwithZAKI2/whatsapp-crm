"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadClientsFromCSV = loadClientsFromCSV;
exports.loadTemplatesFromCSV = loadTemplatesFromCSV;
const fs = require("fs");
const path = require("path");
const sync_1 = require("csv-parse/sync");
function loadClientsFromCSV(csvPath) {
    const content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    const records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map((r, idx) => ({
        id: r.id || String(idx + 1),
        name: r.name,
        phone: r.phone,
        optIn: r.optIn === undefined ? true : (r.optIn === 'true' || r.optIn === '1')
    })).map((c) => (Object.assign(Object.assign({}, c), { id: String(c.id) })));
}
function loadTemplatesFromCSV(csvPath) {
    const content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    const records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map((r, idx) => ({
        id: r.id || String(idx + 1),
        text: r.text
    }));
}
