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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToClient = sendMessageToClient;
exports.getWhatsAppClient = getWhatsAppClient;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const csvUtils_1 = require("./csvUtils");
const templateEngine_1 = require("./templateEngine");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const CLIENTS_CSV = path.join(__dirname, '../data/clients.csv');
const TEMPLATES_CSV = path.join(__dirname, '../data/templates.csv');
const SENT_LOG_JSON = path.join(__dirname, '../data/sentLog.json');
const SESSION_FOLDER = path.join(__dirname, '..', '.wwebjs_auth'); // or your LocalAuth config
let whatsappClient = null;
let isReady = false;
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
        whatsappClient.on('qr', (qr) => {
            // Only show QR if not authenticated
            if (!isReady && !fs.existsSync(path.join(SESSION_FOLDER, 'Default'))) {
                console.log('[initWhatsAppClient] QR code event fired. Scan this QR code with your WhatsApp:');
                qrcode.generate(qr, { small: true });
            }
            else {
                console.log('[initWhatsAppClient] QR code event ignored (session should exist).');
            }
        });
        whatsappClient.on('ready', () => {
            isReady = true;
            console.log('[initWhatsAppClient] WhatsApp client is ready (UI backend)!');
        });
        whatsappClient.on('auth_failure', (msg) => {
            isReady = false;
            console.error('[initWhatsAppClient] WhatsApp auth failure:', msg);
        });
        whatsappClient.on('disconnected', (reason) => {
            isReady = false;
            console.error('[initWhatsAppClient] WhatsApp client disconnected:', reason);
        });
        whatsappClient.initialize().catch((err) => {
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
    return __awaiter(this, void 0, void 0, function* () {
        if (!isReady) {
            console.error('[getWhatsAppClient] WhatsApp client not ready. Please wait for initialization.');
            throw new Error('WhatsApp client not ready. Please wait for initialization.');
        }
        return whatsappClient;
    });
}
function sendMessageToClient(clientId, templateId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[sendMessageToClient] Called with clientId=${clientId}, templateId=${templateId}`);
        const clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
        const templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
        const sentLog = loadSentLog();
        const clientObj = clients.find(c => c.id === clientId);
        if (!clientObj) {
            console.error('Client not found:', clientId);
            throw new Error('Client not found');
        }
        if (clientObj.optIn === false) {
            console.error('Client opted out:', clientId);
            throw new Error('Client opted out');
        }
        if (!/^\d{8,15}$/.test(clientObj.phone)) {
            console.error('Invalid phone number:', clientObj.phone);
            throw new Error('Invalid phone number');
        }
        let template = templates.find(t => t.id === templateId);
        if (!template) {
            const shuffled = (0, templateEngine_1.getShuffledTemplates)(templates);
            template = shuffled[0];
            console.warn('Template not found, using random template:', template.id);
        }
        const message = (0, templateEngine_1.personalizeTemplate)(template, clientObj, true);
        const chatId = clientObj.phone + '@c.us';
        // Remove unnecessary waiting/logging since client is already ready
        if (!isReady) {
            console.error('[sendMessageToClient] WhatsApp client not ready. Please wait for initialization.');
            throw new Error('WhatsApp client not ready. Please wait for initialization.');
        }
        try {
            console.log(`[sendMessageToClient] Checking registration for ${chatId}...`);
            if (!whatsappClient) {
                throw new Error('WhatsApp client is not initialized.');
            }
            const isRegistered = yield whatsappClient.isRegisteredUser(chatId);
            if (!isRegistered) {
                console.error('Number is not registered on WhatsApp:', clientObj.phone);
                throw new Error('Number is not registered on WhatsApp');
            }
            console.log(`[sendMessageToClient] Sending message to ${chatId}: ${message}`);
            yield whatsappClient.sendMessage(chatId, message);
            sentLog.push({
                clientId: clientObj.id,
                templateId: template.id,
                time: new Date().toISOString(),
                status: 'sent'
            });
            saveSentLog(sentLog);
            console.log(`[sendMessageToClient] Message sent to ${clientObj.name} (${clientObj.phone})`);
            return { status: 'sent', client: clientObj.name, phone: clientObj.phone, template: template.text };
        }
        catch (err) {
            console.error('[sendMessageToClient] Error sending message:', err);
            throw err;
        }
    });
}
