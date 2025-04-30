"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadClientsFromCSV = loadClientsFromCSV;
exports.loadTemplatesFromCSV = loadTemplatesFromCSV;
var fs_1 = require("fs");
var path_1 = require("path");
var sync_1 = require("csv-parse/sync");
function loadClientsFromCSV(csvPath) {
    var content = fs_1.default.readFileSync(path_1.default.resolve(csvPath), 'utf8');
    var records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map(function (r, idx) { return ({
        id: r.id || String(idx + 1),
        name: r.name,
        phone: r.phone,
        optIn: r.optIn === 'true' || r.optIn === '1' // treat as boolean
    }); });
}
function loadTemplatesFromCSV(csvPath) {
    var content = fs_1.default.readFileSync(path_1.default.resolve(csvPath), 'utf8');
    var records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map(function (r, idx) { return ({
        id: r.id || String(idx + 1),
        text: r.text
    }); });
}
