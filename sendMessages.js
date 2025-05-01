"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var whatsapp_web_js_1 = require("whatsapp-web.js");
var qrcode_terminal_1 = require("qrcode-terminal");
var inquirer_1 = require("inquirer");
var fs_1 = require("fs");
var templateEngine_1 = require("./backend/templateEngine");
var csvUtils_1 = require("./backend/csvUtils");
var scheduler_1 = require("./backend/scheduler");
var CLIENTS_CSV = './data/clients.csv';
var TEMPLATES_CSV = './data/templates.csv';
var SENT_LOG_JSON = './data/sentLog.json';
var clients = [];
var templates = [];
var sentLog = [];
// Persistent log helpers
function loadSentLog() {
    try {
        if (fs_1.default.existsSync(SENT_LOG_JSON)) {
            var data = fs_1.default.readFileSync(SENT_LOG_JSON, 'utf8');
            sentLog = JSON.parse(data);
        }
    }
    catch (err) {
        console.error('Failed to load sent log:', err);
        sentLog = [];
    }
}
function saveSentLog() {
    try {
        fs_1.default.writeFileSync(SENT_LOG_JSON, JSON.stringify(sentLog, null, 2), 'utf8');
    }
    catch (err) {
        console.error('Failed to save sent log:', err);
    }
}
// Phone number validation (basic, can be improved)
function isValidPhone(phone) {
    return /^\d{8,15}$/.test(phone);
}
function showMenu() {
    return inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Choose an action:',
            choices: [
                'Show Clients',
                'Show Templates',
                'Show Sent Messages',
                'Show Stats', // <-- add this line
                'Send Next Message',
                'Start Scheduler',
                'Exit'
            ]
        }
    ]);
}
function showClients() {
    console.table(clients, ['id', 'name', 'phone']);
}
function showTemplates() {
    console.table(templates, ['id', 'text']);
}
function showSentMessages() {
    console.table(sentLog, ['clientId', 'templateId', 'time', 'status', 'error']);
}
function showStats() {
    var total = sentLog.length;
    var sent = sentLog.filter(function (l) { return l.status === 'sent'; }).length;
    var errors = sentLog.filter(function (l) { return l.status === 'error'; }).length;
    console.log("Total attempts: ".concat(total, ", Sent: ").concat(sent, ", Errors: ").concat(errors));
}
function sendNextMessage(client) {
    return __awaiter(this, void 0, void 0, function () {
        var sentClientIds, nextClient, shuffledTemplates, template, message, chatId, isRegistered, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sentClientIds = new Set(sentLog.map(function (l) { return l.clientId; }));
                    nextClient = clients.find(function (c) { return !sentClientIds.has(c.id) && c.optIn !== false && isValidPhone(c.phone); });
                    if (!nextClient) {
                        console.log('No eligible clients to send to (all sent, opted out, or invalid phone).');
                        return [2 /*return*/];
                    }
                    shuffledTemplates = (0, templateEngine_1.getShuffledTemplates)(templates);
                    template = shuffledTemplates[Math.floor(Math.random() * shuffledTemplates.length)];
                    message = (0, templateEngine_1.personalizeTemplate)(template, nextClient, true);
                    chatId = nextClient.phone + '@c.us';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, client.isRegisteredUser(chatId)];
                case 2:
                    isRegistered = _a.sent();
                    if (!isRegistered) {
                        throw new Error('Number is not registered on WhatsApp');
                    }
                    return [4 /*yield*/, client.sendMessage(chatId, message)];
                case 3:
                    _a.sent();
                    sentLog.push({
                        clientId: nextClient.id,
                        templateId: template.id,
                        time: new Date().toISOString(),
                        status: 'sent'
                    });
                    saveSentLog();
                    console.log("Message sent to ".concat(nextClient.name, " (").concat(nextClient.phone, ")"));
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    sentLog.push({
                        clientId: nextClient.id,
                        templateId: template.id,
                        time: new Date().toISOString(),
                        status: 'error',
                        error: err_1.message
                    });
                    saveSentLog();
                    console.error("Failed to send to ".concat(nextClient.name, ":"), err_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// --- Scheduler integration ---
var scheduler = null;
function startScheduler(client) {
    return __awaiter(this, void 0, void 0, function () {
        var eligibleClients;
        var _this = this;
        return __generator(this, function (_a) {
            if (scheduler) {
                console.log('Scheduler already running.');
                return [2 /*return*/];
            }
            eligibleClients = clients.filter(function (c) { return c.optIn !== false && isValidPhone(c.phone); });
            scheduler = new scheduler_1.SafeScheduler(eligibleClients, templates, true // addEmojis
            );
            // Patch send function to use WhatsApp client
            scheduler.sendFunction = function (clientObj, template, msg) { return __awaiter(_this, void 0, void 0, function () {
                var chatId, isRegistered;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            chatId = clientObj.phone + '@c.us';
                            return [4 /*yield*/, client.isRegisteredUser(chatId)];
                        case 1:
                            isRegistered = _a.sent();
                            if (!isRegistered)
                                throw new Error('Number is not registered on WhatsApp');
                            return [4 /*yield*/, client.sendMessage(chatId, msg)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            scheduler.start();
            console.log('Scheduler started.');
            return [2 /*return*/];
        });
    });
}
// --- Monitor WhatsApp warnings ---
function monitorWarnings(client) {
    client.on('message', function (msg) {
        if (msg.body && msg.body.toLowerCase().includes('suspicious activity')) {
            console.warn('Warning: WhatsApp suspicious activity detected!');
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        var _this = this;
        return __generator(this, function (_a) {
            // Load data
            try {
                clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
                templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
                loadSentLog();
            }
            catch (err) {
                console.error('Failed to load CSV data:', err);
                process.exit(1);
            }
            client = new whatsapp_web_js_1.Client({ authStrategy: new whatsapp_web_js_1.LocalAuth() });
            client.on('qr', function (qr) {
                qrcode_terminal_1.default.generate(qr, { small: true });
                console.log('Scan the QR code above to log in.');
            });
            client.on('ready', function () { return __awaiter(_this, void 0, void 0, function () {
                var action;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log('WhatsApp client is ready!');
                            monitorWarnings(client);
                            _a.label = 1;
                        case 1:
                            if (!true) return [3 /*break*/, 12];
                            return [4 /*yield*/, showMenu()];
                        case 2:
                            action = (_a.sent()).action;
                            if (!(action === 'Show Clients')) return [3 /*break*/, 3];
                            showClients();
                            return [3 /*break*/, 11];
                        case 3:
                            if (!(action === 'Show Templates')) return [3 /*break*/, 4];
                            showTemplates();
                            return [3 /*break*/, 11];
                        case 4:
                            if (!(action === 'Show Sent Messages')) return [3 /*break*/, 5];
                            showSentMessages();
                            return [3 /*break*/, 11];
                        case 5:
                            if (!(action === 'Show Stats')) return [3 /*break*/, 6];
                            showStats(); // <-- add this line
                            return [3 /*break*/, 11];
                        case 6:
                            if (!(action === 'Send Next Message')) return [3 /*break*/, 8];
                            return [4 /*yield*/, sendNextMessage(client)];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 11];
                        case 8:
                            if (!(action === 'Start Scheduler')) return [3 /*break*/, 10];
                            return [4 /*yield*/, startScheduler(client)];
                        case 9:
                            _a.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            if (action === 'Exit') {
                                saveSentLog();
                                console.log('Goodbye!');
                                process.exit(0);
                            }
                            _a.label = 11;
                        case 11: return [3 /*break*/, 1];
                        case 12: return [2 /*return*/];
                    }
                });
            }); });
            client.on('auth_failure', function (msg) {
                console.error('Authentication failure:', msg);
                process.exit(1);
            });
            client.on('disconnected', function (reason) {
                console.error('WhatsApp client disconnected:', reason);
                process.exit(1);
            });
            client.initialize();
            return [2 /*return*/];
        });
    });
}
main();
