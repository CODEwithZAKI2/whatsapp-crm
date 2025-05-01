"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadClientsFromCSV = loadClientsFromCSV;
exports.loadTemplatesFromCSV = loadTemplatesFromCSV;
var fs = require("fs");
var path = require("path");
var sync_1 = require("csv-parse/sync");
function loadClientsFromCSV(csvPath) {
    var content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    var records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map(function (r, idx) { return ({
        id: r.id || String(idx + 1),
        name: r.name,
        phone: r.phone,
        optIn: r.optIn === undefined ? true : (r.optIn === 'true' || r.optIn === '1')
    }); }).map(function (c) { return (__assign(__assign({}, c), { id: String(c.id) })); });
}
function loadTemplatesFromCSV(csvPath) {
    var content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    var records = (0, sync_1.parse)(content, { columns: true, skip_empty_lines: true });
    return records.map(function (r, idx) { return ({
        id: r.id || String(idx + 1),
        text: r.text
    }); });
}
