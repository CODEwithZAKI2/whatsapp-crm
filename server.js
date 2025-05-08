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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var fs = require("fs");
var http = require("http");
var socket_io_1 = require("socket.io");
var sendMessage_1 = require("./backend/sendMessage");
var csvUtils_1 = require("./backend/csvUtils");
var scheduler_1 = require("./backend/scheduler");
var db_1 = require("./backend/db");
var app = express();
var PORT = 3000;
var CLIENTS_CSV = path.resolve(__dirname, 'data', 'clients.csv');
var TEMPLATES_CSV = path.join(__dirname, 'data/templates.csv');
app.use(bodyParser.json());
// Always resolve UI path relative to the project root
var uiPath = path.resolve(__dirname, './ui');
var indexPath = path.join(uiPath, 'index.html');
console.log("Serving static files from: ".concat(uiPath));
console.log("Looking for index.html at: ".concat(indexPath));
if (!fs.existsSync(indexPath)) {
    console.error('ERROR: index.html not found at', indexPath);
}
// Serve static files
app.use(express.static(uiPath));
// Serve index.html for the root route
app.get('/', function (req, res) {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(404).send('index.html not found on server');
    }
    return Promise.resolve();
});
// --- CLIENTS CRUD ---
function saveClients(clients) {
    var csv = __spreadArray(['id,name,phone,optIn'], clients.map(function (c) {
        return "".concat(c.id, ",").concat(c.name, ",").concat(c.phone, ",").concat(c.optIn);
    }), true).join('\n');
    fs.writeFileSync(CLIENTS_CSV, csv, 'utf8');
}
// Only update the GET /clients endpoint to use MySQL
app.get('/clients', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, clients, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.pool.query('SELECT id, name, contact_numbers, optIn FROM persons')];
            case 1:
                rows = (_a.sent())[0];
                clients = rows.map(function (row) {
                    var phone = '';
                    try {
                        var numbers = JSON.parse(row.contact_numbers);
                        if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
                            phone = numbers[0].value;
                        }
                    }
                    catch (_a) {
                        phone = '';
                    }
                    return {
                        id: row.id.toString(),
                        name: row.name,
                        phone: phone,
                        optIn: !!row.optIn // Use the value from the database, ensure boolean
                    };
                });
                res.json({ clients: clients });
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                console.error('Error fetching clients from MySQL:', err_1);
                res.json({ clients: [] });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/clients', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, phone, optIn, contact_numbers, result, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, phone = _a.phone, optIn = _a.optIn;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                contact_numbers = JSON.stringify([{ value: phone, label: 'work' }]);
                return [4 /*yield*/, db_1.pool.query('INSERT INTO persons (name, contact_numbers, optIn) VALUES (?, ?, ?)', [name, contact_numbers, optIn ? 1 : 0])];
            case 2:
                result = (_b.sent())[0];
                res.json({ success: true, id: result.insertId });
                return [3 /*break*/, 4];
            case 3:
                err_2 = _b.sent();
                console.error('Error inserting client:', err_2);
                res.json({ success: false, message: 'Failed to add client' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.put('/clients/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, phone, optIn, id, contact_numbers, err_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, phone = _a.phone, optIn = _a.optIn;
                id = req.params.id;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                contact_numbers = JSON.stringify([{ value: phone, label: 'work' }]);
                return [4 /*yield*/, db_1.pool.query('UPDATE persons SET name = ?, contact_numbers = ?, optIn = ? WHERE id = ?', [name, contact_numbers, optIn ? 1 : 0, id])];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                console.error('Error updating client:', err_3);
                res.json({ success: false, message: 'Failed to update client' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.delete('/clients/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                // Delete client from the database
                return [4 /*yield*/, db_1.pool.query('DELETE FROM persons WHERE id = ?', [id])];
            case 2:
                // Delete client from the database
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                err_4 = _a.sent();
                console.error('Error deleting client:', err_4);
                res.json({ success: false, message: 'Failed to delete client' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// --- TEMPLATES CRUD ---
function saveTemplates(templates) {
    var csv = __spreadArray(['id,text'], templates.map(function (t) {
        return "".concat(t.id, ",\"").concat((t.text || '').replace(/"/g, '""'), "\"");
    }), true).join('\n');
    fs.writeFileSync(TEMPLATES_CSV, csv, 'utf8');
}
app.get('/templates', function (req, res) {
    var templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    res.json({ templates: templates });
    return Promise.resolve();
});
app.post('/templates', function (req, res) {
    var templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    var text = req.body.text;
    // Generate unique template id like t8, t9, etc.
    var lastIdNum = 0;
    if (templates.length > 0) {
        // Find the max numeric part of ids like t8, t9, etc.
        lastIdNum = Math.max.apply(Math, templates
            .map(function (t) { return typeof t.id === 'string' && t.id.startsWith('t') ? parseInt(t.id.slice(1)) : 0; })
            .filter(function (n) { return !isNaN(n); }));
    }
    var id = "t".concat(lastIdNum + 1);
    templates.push({ id: id, text: text });
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});
app.put('/templates/:id', function (req, res) {
    var templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    var text = req.body.text;
    templates = templates.map(function (t) { return t.id === req.params.id ? __assign(__assign({}, t), { text: text }) : t; });
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});
app.delete('/templates/:id', function (req, res) {
    var templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    templates = templates.filter(function (t) { return t.id !== req.params.id; });
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});
// --- SEND MESSAGE ---
app.post('/send-message', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clientId, templateId, rows, client, result, error_1, errorMsg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, clientId = _a.clientId, templateId = _a.templateId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db_1.pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId])];
            case 2:
                rows = (_b.sent())[0];
                if (!Array.isArray(rows) || rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Client not found' })];
                }
                client = rows[0];
                return [4 /*yield*/, (0, sendMessage_1.sendMessageToClient)(client.id.toString(), templateId)];
            case 3:
                result = _b.sent();
                res.json({ success: true, message: 'Message sent successfully!', result: result });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                errorMsg = 'Unknown error';
                if (error_1 instanceof Error) {
                    errorMsg = error_1.message;
                }
                res.status(500).json({ success: false, message: 'Failed to send message', error: errorMsg });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/, Promise.resolve()];
        }
    });
}); });
app.post('/send-message-activity', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clientId, templateId, leadId, userId, userRows, rows, client, templates, template, message, now, formattedNow, activityResult, activityId, result, error_2, errorMsg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, clientId = _a.clientId, templateId = _a.templateId, leadId = _a.leadId, userId = _a.userId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, db_1.pool.query('SELECT id FROM users WHERE id = ?', [userId])];
            case 2:
                userRows = (_b.sent())[0];
                if (!Array.isArray(userRows) || userRows.length === 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: "User ID ".concat(userId, " does not exist in users table.") })];
                }
                return [4 /*yield*/, db_1.pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId])];
            case 3:
                rows = (_b.sent())[0];
                if (!Array.isArray(rows) || rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Client not found' })];
                }
                client = rows[0];
                templates = require('./backend/csvUtils').loadTemplatesFromCSV(require('path').join(__dirname, 'data/templates.csv'));
                template = templates.find(function (t) { return t.id === templateId; });
                if (!template) {
                    template = templates[0];
                }
                message = template.text;
                if (client.name) {
                    message = message.replace(/{{\s*name\s*}}/gi, client.name);
                }
                now = new Date();
                formattedNow = now.toISOString().slice(0, 19).replace('T', ' ');
                return [4 /*yield*/, db_1.pool.query('INSERT INTO activities (user_id, title, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [userId, 'Whatsapp', message, formattedNow, formattedNow])];
            case 4:
                activityResult = (_b.sent())[0];
                activityId = activityResult.insertId;
                // Insert into lead_activities
                return [4 /*yield*/, db_1.pool.query('INSERT INTO lead_activities (activity_id, lead_id) VALUES (?, ?)', [activityId, leadId])];
            case 5:
                // Insert into lead_activities
                _b.sent();
                return [4 /*yield*/, (0, sendMessage_1.sendMessageToClient)(client.id.toString(), templateId)];
            case 6:
                result = _b.sent();
                res.json({ success: true, message: 'Message sent and activity stored!', activityId: activityId, result: result });
                return [3 /*break*/, 8];
            case 7:
                error_2 = _b.sent();
                errorMsg = 'Unknown error';
                if (error_2 instanceof Error)
                    errorMsg = error_2.message;
                console.error('send-message-activity error:', error_2);
                res.status(500).json({ success: false, message: 'Failed to send message or store activity', error: errorMsg });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/, Promise.resolve()];
        }
    });
}); });
// --- SENT LOG ENDPOINT ---
app.get('/sent-log', function (req, res) {
    var sentLogPath = path.resolve(__dirname, 'data', 'sentLog.json');
    try {
        if (!fs.existsSync(sentLogPath)) {
            fs.writeFileSync(sentLogPath, '[]', 'utf8');
        }
        var sentLog = JSON.parse(fs.readFileSync(sentLogPath, 'utf8'));
        res.json({ sentLog: sentLog });
    }
    catch (err) {
        console.error('Error reading sentLog.json:', err);
        res.json({ sentLog: [] });
    }
    return Promise.resolve();
});
// --- SCHEDULER ---
var scheduler = null;
var schedulerStartTimeout = null;
app.post('/start-scheduler', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clients, templates, startTime, startTimestamp, now, delay;
    return __generator(this, function (_a) {
        if (scheduler && scheduler.state && !scheduler.state.paused) {
            res.json({ success: false, message: 'Scheduler already running.' });
            return [2 /*return*/];
        }
        clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
        templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
        scheduler = new scheduler_1.SafeScheduler(clients, templates, true);
        scheduler.sendFunction = function (clientObj, template, msg) { return __awaiter(void 0, void 0, void 0, function () {
            var err_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, sendMessage_1.sendMessageToClient)(clientObj.id, template.id)];
                    case 1:
                        _a.sent();
                        console.log("Scheduler: Message sent to client ".concat(clientObj.id, " using template ").concat(template.id));
                        return [3 /*break*/, 3];
                    case 2:
                        err_5 = _a.sent();
                        console.error("Scheduler: Failed to send message to client ".concat(clientObj.id, ":"), err_5);
                        throw err_5;
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        if (schedulerStartTimeout) {
            clearTimeout(schedulerStartTimeout);
            schedulerStartTimeout = null;
        }
        startTime = req.body.startTime;
        if (startTime) {
            startTimestamp = new Date(startTime).getTime();
            now = Date.now();
            if (startTimestamp > now) {
                delay = startTimestamp - now;
                console.log("[Scheduler] Will start at ".concat(startTime, " (in ").concat(Math.round(delay / 1000), " seconds)"));
                schedulerStartTimeout = setTimeout(function () {
                    scheduler.start();
                }, delay);
                res.json({ success: true, message: "Scheduler will start at ".concat(startTime) });
                return [2 /*return*/];
            }
        }
        scheduler.start();
        res.json({ success: true, message: 'Scheduler started!' });
        return [2 /*return*/, Promise.resolve()];
    });
}); });
app.post('/stop-scheduler', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (scheduler) {
            scheduler.pause();
            if (schedulerStartTimeout) {
                clearTimeout(schedulerStartTimeout);
                schedulerStartTimeout = null;
            }
            res.json({ success: true, message: 'Scheduler stopped.' });
        }
        else {
            res.json({ success: false, message: 'Scheduler is not running.' });
        }
        return [2 /*return*/, Promise.resolve()];
    });
}); });
app.get('/scheduler-status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats;
    return __generator(this, function (_a) {
        if (!scheduler) {
            res.json({ running: false });
            return [2 /*return*/];
        }
        stats = scheduler.getStats();
        res.json({
            running: !scheduler.state.paused,
            sentCount: stats.sentCount,
            nextMessageInfo: stats.nextMessageInfo
        });
        return [2 /*return*/, Promise.resolve()];
    });
}); });
// --- MESSAGES FROM OPEN CHATS ---
app.get('/current-messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var client, chats, allMessages_1, _loop_1, _i, chats_1, chat, err_6, errorMsg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                return [4 /*yield*/, (0, sendMessage_1.getWhatsAppClient)()];
            case 1:
                client = _a.sent();
                return [4 /*yield*/, client.getChats()];
            case 2:
                chats = _a.sent();
                allMessages_1 = [];
                _loop_1 = function (chat) {
                    var messages;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, chat.fetchMessages({ limit: 50 })];
                            case 1:
                                messages = _b.sent();
                                messages.forEach(function (msg) {
                                    allMessages_1.push({
                                        chatId: chat.id._serialized,
                                        chatName: chat.name || '',
                                        from: msg.from,
                                        to: msg.to,
                                        body: msg.body,
                                        timestamp: msg.timestamp,
                                        id: msg.id._serialized,
                                        type: msg.type,
                                        isSentByMe: msg.fromMe
                                    });
                                });
                                return [2 /*return*/];
                        }
                    });
                };
                _i = 0, chats_1 = chats;
                _a.label = 3;
            case 3:
                if (!(_i < chats_1.length)) return [3 /*break*/, 6];
                chat = chats_1[_i];
                return [5 /*yield**/, _loop_1(chat)];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                res.json({ messages: allMessages_1 });
                return [3 /*break*/, 8];
            case 7:
                err_6 = _a.sent();
                errorMsg = 'Unknown error';
                if (err_6 instanceof Error)
                    errorMsg = err_6.message;
                res.status(500).json({ messages: [], error: errorMsg });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/, Promise.resolve()];
        }
    });
}); });
// --- Log buffer and emit logic ---
var server = http.createServer(app);
var io = new socket_io_1.Server(server, { cors: { origin: "*" } });
var logBuffer = [];
function emitLog(msg) {
    logBuffer.push(msg);
    if (logBuffer.length > 200)
        logBuffer.shift();
    io.emit('backend-log', msg);
}
// Patch console.log/warn/error/info to also emit to frontend
['log', 'warn', 'error', 'info'].forEach(function (type) {
    var orig = console[type];
    console[type] = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var msg = args.map(function (a) { return (typeof a === 'object' ? JSON.stringify(a) : String(a)); }).join(' ');
        emitLog("[".concat(type.toUpperCase(), "] ").concat(msg));
        orig.apply(console, args);
    };
});
// Serve logs to new clients
io.on('connection', function (socket) {
    logBuffer.forEach(function (msg) { return socket.emit('backend-log', msg); });
});
// Start server (use server.listen instead of app.listen)
server.listen(PORT, function () {
    console.log("Server is running on http://localhost:".concat(PORT));
    console.log("Serving static files from: ".concat(uiPath));
    console.log("Looking for index.html at: ".concat(indexPath));
    if (!fs.existsSync(indexPath)) {
        console.error('ERROR: index.html not found at', indexPath);
    }
    else {
        console.log('index.html found!');
    }
});
