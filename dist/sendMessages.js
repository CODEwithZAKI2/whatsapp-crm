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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const templateEngine_1 = require("./backend/templateEngine");
const csvUtils_1 = require("./backend/csvUtils");
const scheduler_1 = require("./backend/scheduler");
const CLIENTS_CSV = './data/clients.csv';
const TEMPLATES_CSV = './data/templates.csv';
const SENT_LOG_JSON = './data/sentLog.json';
let clients = [];
let templates = [];
let sentLog = [];
// Persistent log helpers
function loadSentLog() {
    try {
        if (fs_1.default.existsSync(SENT_LOG_JSON)) {
            const data = fs_1.default.readFileSync(SENT_LOG_JSON, 'utf8');
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
    const total = sentLog.length;
    const sent = sentLog.filter(l => l.status === 'sent').length;
    const errors = sentLog.filter(l => l.status === 'error').length;
    console.log(`Total attempts: ${total}, Sent: ${sent}, Errors: ${errors}`);
}
function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}
function getTodaysSentCount() {
    const today = getTodayDateString();
    return sentLog.filter(l => l.time.startsWith(today) && l.status === 'sent').length;
}
function sendNextMessage(client) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find next client who hasn't received a message, is opted in, and has a valid phone
        const sentClientIds = new Set(sentLog.map(l => l.clientId));
        const nextClient = clients.find(c => !sentClientIds.has(c.id) && c.optIn !== false && isValidPhone(c.phone));
        if (!nextClient) {
            console.log('No eligible clients to send to (all sent, opted out, or invalid phone).');
            return;
        }
        // Pick a template (shuffle for variety)
        const shuffledTemplates = (0, templateEngine_1.getShuffledTemplates)(templates);
        const template = shuffledTemplates[Math.floor(Math.random() * shuffledTemplates.length)];
        const message = (0, templateEngine_1.personalizeTemplate)(template, nextClient, true);
        const chatId = nextClient.phone + '@c.us';
        try {
            // Check if number is registered on WhatsApp
            const isRegistered = yield client.isRegisteredUser(chatId);
            if (!isRegistered) {
                throw new Error('Number is not registered on WhatsApp');
            }
            yield client.sendMessage(chatId, message);
            sentLog.push({
                clientId: nextClient.id,
                templateId: template.id,
                time: new Date().toISOString(),
                status: 'sent'
            });
            saveSentLog();
            console.log(`Message sent to ${nextClient.name} (${nextClient.phone})`);
        }
        catch (err) {
            sentLog.push({
                clientId: nextClient.id,
                templateId: template.id,
                time: new Date().toISOString(),
                status: 'error',
                error: err.message
            });
            saveSentLog();
            console.error(`Failed to send to ${nextClient.name}:`, err);
        }
    });
}
function sendMessageToClient(client, clientObj) {
    return __awaiter(this, void 0, void 0, function* () {
        // Pick a template (shuffle for variety)
        const shuffledTemplates = (0, templateEngine_1.getShuffledTemplates)(templates);
        const template = shuffledTemplates[Math.floor(Math.random() * shuffledTemplates.length)];
        const message = (0, templateEngine_1.personalizeTemplate)(template, clientObj, true);
        const chatId = clientObj.phone + '@c.us';
        // Check if number is registered on WhatsApp
        const isRegistered = yield client.isRegisteredUser(chatId);
        if (!isRegistered) {
            throw new Error('Number is not registered on WhatsApp');
        }
        yield client.sendMessage(chatId, message);
        // Optionally, return template id for logging
        return template.id;
    });
}
// --- Scheduler integration ---
let scheduler = null;
function startScheduler(client) {
    return __awaiter(this, void 0, void 0, function* () {
        if (scheduler) {
            console.log('Scheduler already running.');
            return;
        }
        // Only include opted-in clients with valid phone
        const eligibleClients = clients.filter(c => c.optIn !== false && isValidPhone(c.phone));
        scheduler = new scheduler_1.SafeScheduler(eligibleClients, templates, true // addEmojis
        );
        // Patch send function to use WhatsApp client
        scheduler.sendFunction = (clientObj, template, msg) => __awaiter(this, void 0, void 0, function* () {
            const chatId = clientObj.phone + '@c.us';
            const isRegistered = yield client.isRegisteredUser(chatId);
            if (!isRegistered)
                throw new Error('Number is not registered on WhatsApp');
            yield client.sendMessage(chatId, msg);
        });
        scheduler.start();
        console.log('Scheduler started.');
    });
}
function humanizedScheduler(client) {
    return __awaiter(this, void 0, void 0, function* () {
        const eligibleClients = clients.filter(c => !sentLog.some(l => l.clientId === c.id) && c.optIn !== false && isValidPhone(c.phone));
        let sentCount = 0;
        const DAILY_LIMIT = 30;
        for (let i = 0; i < eligibleClients.length; i++) {
            if (getTodaysSentCount() >= DAILY_LIMIT) {
                console.log(`Daily limit of ${DAILY_LIMIT} messages reached. Stopping scheduler.`);
                break;
            }
            const clientObj = eligibleClients[i];
            // Send message logic here (replace with your actual send function)
            const templateId = yield sendMessageToClient(client, clientObj);
            // Update sentLog.json immediately
            sentLog.push({
                clientId: clientObj.id,
                templateId: templateId,
                time: new Date().toISOString(),
                status: "sent"
            });
            saveSentLog();
            sentCount++;
            // After every 10 messages, wait 40–60 minutes
            if (sentCount % 10 === 0 && i !== eligibleClients.length - 1) {
                const batchDelay = 40 * 60 * 1000 + Math.random() * (20 * 60 * 1000); // 40-60 min
                console.log(`Batch limit reached. Waiting ${(batchDelay / 60000).toFixed(1)} minutes...`);
                yield new Promise(res => setTimeout(res, batchDelay));
            }
            else if (i !== eligibleClients.length - 1) {
                // Wait 2–5 minutes between messages
                const delay = 2 * 60 * 1000 + Math.random() * (3 * 60 * 1000); // 2-5 min
                console.log(`Waiting ${(delay / 60000).toFixed(1)} minutes before next message...`);
                yield new Promise(res => setTimeout(res, delay));
            }
        }
        console.log("All eligible messages sent.");
    });
}
// --- Monitor WhatsApp warnings ---
function monitorWarnings(client) {
    client.on('message', msg => {
        if (msg.body && msg.body.toLowerCase().includes('suspicious activity')) {
            console.warn('Warning: WhatsApp suspicious activity detected!');
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
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
        console.log('Loaded clients:', clients);
        // WhatsApp client
        const client = new whatsapp_web_js_1.Client({ authStrategy: new whatsapp_web_js_1.LocalAuth() });
        client.on('qr', (qr) => {
            qrcode_terminal_1.default.generate(qr, { small: true });
            console.log('Scan the QR code above to log in.');
        });
        client.on('ready', () => __awaiter(this, void 0, void 0, function* () {
            console.log('WhatsApp client is ready!');
            monitorWarnings(client);
            while (true) {
                const { action } = yield showMenu();
                if (action === 'Show Clients')
                    showClients();
                else if (action === 'Show Templates')
                    showTemplates();
                else if (action === 'Show Sent Messages')
                    showSentMessages();
                else if (action === 'Show Stats')
                    showStats(); // <-- add this line
                else if (action === 'Send Next Message')
                    yield sendNextMessage(client);
                else if (action === 'Start Scheduler')
                    yield startScheduler(client);
                else if (action === 'Exit') {
                    saveSentLog();
                    console.log('Goodbye!');
                    process.exit(0);
                }
            }
        }));
        client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
            process.exit(1);
        });
        client.on('disconnected', (reason) => {
            console.error('WhatsApp client disconnected:', reason);
            process.exit(1);
        });
        client.initialize();
    });
}
main();
