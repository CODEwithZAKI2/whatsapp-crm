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
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const sendMessage_1 = require("./backend/sendMessage");
const csvUtils_1 = require("./backend/csvUtils");
const scheduler_1 = require("./backend/scheduler");
const app = express();
const PORT = 3000;
const CLIENTS_CSV = path.resolve(__dirname, 'data', 'clients.csv');
const TEMPLATES_CSV = path.join(__dirname, 'data/templates.csv');
app.use(bodyParser.json());
// Always resolve UI path relative to the project root
const uiPath = path.resolve(__dirname, './ui');
const indexPath = path.join(uiPath, 'index.html');
console.log(`Serving static files from: ${uiPath}`);
console.log(`Looking for index.html at: ${indexPath}`);
if (!fs.existsSync(indexPath)) {
    console.error('ERROR: index.html not found at', indexPath);
}
// Serve static files
app.use(express.static(uiPath));
// Serve index.html for the root route
app.get('/', (req, res) => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(404).send('index.html not found on server');
    }
});
// --- CLIENTS CRUD ---
function saveClients(clients) {
    const csv = ['id,name,phone,optIn', ...clients.map(c => `${c.id},${c.name},${c.phone},${c.optIn}`)].join('\n');
    fs.writeFileSync(CLIENTS_CSV, csv, 'utf8');
}
app.get('/clients', (req, res) => {
    // Always log when this endpoint is hit
    console.log('GET /clients called');
    try {
        // Log the resolved path and file existence
        console.log('Fetching clients from:', CLIENTS_CSV, 'Exists:', fs.existsSync(CLIENTS_CSV));
        if (!fs.existsSync(CLIENTS_CSV)) {
            // If the file does not exist, create it with headers
            fs.writeFileSync(CLIENTS_CSV, 'id,name,phone,optIn\n', 'utf8');
            console.log('Created missing clients.csv at:', CLIENTS_CSV);
        }
        const clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
        res.json({ clients });
    }
    catch (err) {
        console.error('Error reading clients:', err);
        res.json({ clients: [] });
    }
});
app.post('/clients', (req, res) => {
    let clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
    const { name, phone, optIn } = req.body;
    const id = (clients.length ? (parseInt(clients[clients.length - 1].id) + 1) : 1).toString();
    clients.push({ id, name, phone, optIn });
    saveClients(clients);
    res.json({ success: true });
});
app.put('/clients/:id', (req, res) => {
    let clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
    const { name, phone, optIn } = req.body;
    clients = clients.map(c => c.id === req.params.id ? Object.assign(Object.assign({}, c), { name, phone, optIn }) : c);
    saveClients(clients);
    res.json({ success: true });
});
app.delete('/clients/:id', (req, res) => {
    let clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
    clients = clients.filter(c => c.id !== req.params.id);
    saveClients(clients);
    res.json({ success: true });
});
// --- TEMPLATES CRUD ---
function saveTemplates(templates) {
    const csv = ['id,text', ...templates.map(t => `${t.id},"${(t.text || '').replace(/"/g, '""')}"`)].join('\n');
    fs.writeFileSync(TEMPLATES_CSV, csv, 'utf8');
}
app.get('/templates', (req, res) => {
    const templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    res.json({ templates });
});
app.post('/templates', (req, res) => {
    let templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    const { text } = req.body;
    // Generate unique template id like t8, t9, etc.
    let lastIdNum = 0;
    if (templates.length > 0) {
        // Find the max numeric part of ids like t8, t9, etc.
        lastIdNum = Math.max(...templates
            .map(t => typeof t.id === 'string' && t.id.startsWith('t') ? parseInt(t.id.slice(1)) : 0)
            .filter(n => !isNaN(n)));
    }
    const id = `t${lastIdNum + 1}`;
    templates.push({ id, text });
    saveTemplates(templates);
    res.json({ success: true });
});
app.put('/templates/:id', (req, res) => {
    let templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    const { text } = req.body;
    templates = templates.map(t => t.id === req.params.id ? Object.assign(Object.assign({}, t), { text }) : t);
    saveTemplates(templates);
    res.json({ success: true });
});
app.delete('/templates/:id', (req, res) => {
    let templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    templates = templates.filter(t => t.id !== req.params.id);
    saveTemplates(templates);
    res.json({ success: true });
});
// --- SEND MESSAGE ---
app.post('/send-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { clientId, templateId } = req.body;
    try {
        const result = yield (0, sendMessage_1.sendMessageToClient)(clientId, templateId);
        res.json({ success: true, message: 'Message sent successfully!', result });
    }
    catch (error) {
        let errorMsg = 'Unknown error';
        if (error instanceof Error) {
            errorMsg = error.message;
        }
        res.status(500).json({ success: false, message: 'Failed to send message', error: errorMsg });
    }
}));
// --- SENT LOG ENDPOINT ---
app.get('/sent-log', (req, res) => {
    const sentLogPath = path.resolve(__dirname, 'data', 'sentLog.json');
    try {
        if (!fs.existsSync(sentLogPath)) {
            fs.writeFileSync(sentLogPath, '[]', 'utf8');
        }
        const sentLog = JSON.parse(fs.readFileSync(sentLogPath, 'utf8'));
        res.json({ sentLog });
    }
    catch (err) {
        console.error('Error reading sentLog.json:', err);
        res.json({ sentLog: [] });
    }
});
// --- SCHEDULER ---
let scheduler = null;
app.post('/start-scheduler', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (scheduler && scheduler.state && !scheduler.state.paused) {
        res.json({ success: false, message: 'Scheduler already running.' });
        return;
    }
    const clients = (0, csvUtils_1.loadClientsFromCSV)(CLIENTS_CSV);
    const templates = (0, csvUtils_1.loadTemplatesFromCSV)(TEMPLATES_CSV);
    scheduler = new scheduler_1.SafeScheduler(clients, templates, true);
    // You must provide a sendFunction that sends WhatsApp messages
    scheduler.sendFunction = (clientObj, template, msg) => __awaiter(void 0, void 0, void 0, function* () {
        // Use your WhatsApp send logic here:
        try {
            yield (0, sendMessage_1.sendMessageToClient)(clientObj.id, template.id);
            console.log(`Scheduler: Message sent to client ${clientObj.id} using template ${template.id}`);
        }
        catch (err) {
            console.error(`Scheduler: Failed to send message to client ${clientObj.id}:`, err);
            throw err;
        }
    });
    scheduler.start();
    res.json({ success: true, message: 'Scheduler started!' });
}));
// --- MESSAGES FROM OPEN CHATS ---
app.get('/current-messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield (0, sendMessage_1.getWhatsAppClient)();
        const chats = yield client.getChats();
        let allMessages = [];
        for (const chat of chats) {
            const messages = yield chat.fetchMessages({ limit: 50 });
            messages.forEach(msg => {
                allMessages.push({
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
        }
        res.json({ messages: allMessages });
    }
    catch (err) {
        let errorMsg = 'Unknown error';
        if (err instanceof Error)
            errorMsg = err.message;
        res.status(500).json({ messages: [], error: errorMsg });
    }
}));
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${uiPath}`);
    console.log(`Looking for index.html at: ${indexPath}`);
    if (!fs.existsSync(indexPath)) {
        console.error('ERROR: index.html not found at', indexPath);
    }
    else {
        console.log('index.html found!');
    }
});
