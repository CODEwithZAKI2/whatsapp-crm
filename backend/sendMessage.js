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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToClient = sendMessageToClient;
exports.getWhatsAppClient = getWhatsAppClient;
var whatsapp_web_js_1 = require("whatsapp-web.js");
var csvUtils_1 = require("./csvUtils");
var templateEngine_1 = require("./templateEngine");
var db_1 = require("./db");
var fs = require("fs");
var path = require("path");
var qrcode = require("qrcode-terminal");
var CLIENTS_CSV = path.join(__dirname, '../data/clients.csv');
var TEMPLATES_CSV = path.join(__dirname, '../data/templates.csv');
var SENT_LOG_JSON = path.join(__dirname, '../data/sentLog.json');
var SESSION_FOLDER = path.join(__dirname, '..', '.wwebjs_auth'); // or your LocalAuth config
var whatsappClient = null;
var isReady = false;
// Enhanced initialization with more logging and QR code
function initWhatsAppClient() {
    if (!whatsappClient) {
        // Ensure session folder exists for LocalAuth to persist session
        if (!fs.existsSync(SESSION_FOLDER)) {
            fs.mkdirSync(SESSION_FOLDER, { recursive: true });
        }
        console.log('[initWhatsAppClient] Creating WhatsApp client...');
        whatsappClient = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({ dataPath: SESSION_FOLDER }),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });
        whatsappClient.on('qr', function (qr) {
            // Only show QR if not authenticated
            if (!isReady && !fs.existsSync(path.join(SESSION_FOLDER, 'Default'))) {
                console.log('[initWhatsAppClient] QR code event fired. Scan this QR code with your WhatsApp:');
                qrcode.generate(qr, { small: true });
            }
            else {
                console.log('[initWhatsAppClient] QR code event ignored (session should exist).');
            }
        });
        whatsappClient.on('ready', function () {
            isReady = true;
            console.log('[initWhatsAppClient] WhatsApp client is ready (UI backend)!');
        });
        whatsappClient.on('auth_failure', function (msg) {
            isReady = false;
            console.error('[initWhatsAppClient] WhatsApp auth failure:', msg);
        });
        whatsappClient.on('disconnected', function (reason) {
            isReady = false;
            console.error('[initWhatsAppClient] WhatsApp client disconnected:', reason);
        });
        whatsappClient.initialize().catch(function (err) {
            isReady = false;
            console.error('[initWhatsAppClient] Initialization error:', err);
        });
    }
    else {
        console.log('[initWhatsAppClient] WhatsApp client already exists.');
    }
}
initWhatsAppClient();
function saveSentLog(sentLog) {
    fs.writeFileSync(SENT_LOG_JSON, JSON.stringify(sentLog, null, 2), 'utf8');
}
function loadSentLog() {
    if (fs.existsSync(SENT_LOG_JSON)) {
        return JSON.parse(fs.readFileSync(SENT_LOG_JSON, 'utf8'));
    }
    return [];
}
function getWhatsAppClient() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!isReady) {
                console.error('[getWhatsAppClient] WhatsApp client not ready. Please wait for initialization.');
                throw new Error('WhatsApp client not ready. Please wait for initialization.');
            }
            return [2 /*return*/, whatsappClient];
        });
    });
}
function sendMessageToClient(clientId, templateId) {
    return __awaiter(this, void 0, void 0, function () {
        var clientRows, clientObj, phone, numbers, templates, sentLog, template, shuffled, message, chatId, isRegistered, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[sendMessageToClient] Called with clientId=".concat(clientId, ", templateId=").concat(templateId));
                    return [4 /*yield*/, db_1.pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId])];
                case 1:
                    clientRows = (_a.sent())[0];
                    if (!Array.isArray(clientRows) || clientRows.length === 0) {
                        console.error('Client not found:', clientId);
                        throw new Error('Client not found');
                    }
                    clientObj = clientRows[0];
                    phone = '';
                    try {
                        numbers = JSON.parse(clientObj.contact_numbers);
                        if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
                            phone = numbers[0].value;
                        }
                    }
                    catch (_b) {
                        phone = '';
                    }
                    if (clientObj.optIn === false || clientObj.optIn === 0) {
                        console.error('Client opted out:', clientId);
                        throw new Error('Client opted out');
                    }
                    if (!/^\d{8,15}$/.test(phone)) {
                        console.error('Invalid phone number:', phone);
                        throw new Error('Invalid phone number');
                    }
                    templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
                    sentLog = loadSentLog();
                    template = templates.find(function (t) { return t.id === templateId; });
                    if (!template) {
                        shuffled = (0, templateEngine_1.getShuffledTemplates)(templates);
                        template = shuffled[0];
                        console.warn('Template not found, using random template:', template.id);
                    }
                    message = (0, templateEngine_1.personalizeTemplate)(template, __assign(__assign({}, clientObj), { phone: phone }), true);
                    chatId = phone + '@c.us';
                    if (!isReady) {
                        console.error('[sendMessageToClient] WhatsApp client not ready. Please wait for initialization.');
                        throw new Error('WhatsApp client not ready. Please wait for initialization.');
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    console.log("[sendMessageToClient] Checking registration for ".concat(chatId, "..."));
                    if (!whatsappClient) {
                        throw new Error('WhatsApp client is not initialized.');
                    }
                    return [4 /*yield*/, whatsappClient.isRegisteredUser(chatId)];
                case 3:
                    isRegistered = _a.sent();
                    if (!isRegistered) {
                        console.error('Number is not registered on WhatsApp:', phone);
                        throw new Error('Number is not registered on WhatsApp');
                    }
                    console.log("[sendMessageToClient] Sending message to ".concat(chatId, ": ").concat(message));
                    return [4 /*yield*/, whatsappClient.sendMessage(chatId, message)];
                case 4:
                    _a.sent();
                    sentLog.push({
                        clientId: clientObj.id,
                        templateId: template.id,
                        time: new Date().toISOString(),
                        status: 'sent'
                    });
                    saveSentLog(sentLog);
                    console.log("[sendMessageToClient] Message sent to ".concat(clientObj.name, " (").concat(phone, ")"));
                    return [2 /*return*/, { status: 'sent', client: clientObj.name, phone: phone, template: template.text }];
                case 5:
                    err_1 = _a.sent();
                    console.error('[sendMessageToClient] Error sending message:', err_1);
                    throw err_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
