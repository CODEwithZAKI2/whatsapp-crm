import { Client, LocalAuth } from 'whatsapp-web.js';
import { loadClientsFromCSV, loadTemplatesFromCSV } from './csvUtils';
import { getShuffledTemplates, personalizeTemplate } from './templateEngine';
import * as fs from 'fs';
import * as path from 'path';
import * as qrcode from 'qrcode-terminal';

const CLIENTS_CSV = path.join(__dirname, '../data/clients.csv');
const TEMPLATES_CSV = path.join(__dirname, '../data/templates.csv');
const SENT_LOG_JSON = path.join(__dirname, '../data/sentLog.json');

let whatsappClient: Client | null = null;
let isReady = false;

// Enhanced initialization with more logging and QR code
function initWhatsAppClient() {
    if (!whatsappClient) {
        console.log('[initWhatsAppClient] Creating WhatsApp client...');
        whatsappClient = new Client({ authStrategy: new LocalAuth() });
        whatsappClient.on('qr', (qr) => {
            console.log('[initWhatsAppClient] QR code event fired. Scan this QR code with your WhatsApp:');
            qrcode.generate(qr, { small: true });
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
    } else {
        console.log('[initWhatsAppClient] WhatsApp client already exists.');
    }
}
initWhatsAppClient();

function saveSentLog(sentLog: any[]) {
    fs.writeFileSync(SENT_LOG_JSON, JSON.stringify(sentLog, null, 2), 'utf8');
}

function loadSentLog(): any[] {
    if (fs.existsSync(SENT_LOG_JSON)) {
        return JSON.parse(fs.readFileSync(SENT_LOG_JSON, 'utf8'));
    }
    return [];
}

async function getWhatsAppClient(): Promise<Client> {
    if (!isReady) {
        console.error('[getWhatsAppClient] WhatsApp client not ready. Please wait for initialization.');
        throw new Error('WhatsApp client not ready. Please wait for initialization.');
    }
    return whatsappClient!;
}

export async function sendMessageToClient(clientId: string, templateId: string) {
    console.log(`[sendMessageToClient] Called with clientId=${clientId}, templateId=${templateId}`);
    const clients = loadClientsFromCSV(CLIENTS_CSV);
    const templates = loadTemplatesFromCSV(TEMPLATES_CSV);
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
        // fallback: pick a random template
        const shuffled = getShuffledTemplates(templates);
        template = shuffled[0];
        console.warn('Template not found, using random template:', template.id);
    }

    const message = personalizeTemplate(template, clientObj, true);
    const chatId = clientObj.phone + '@c.us';

    console.log(`[sendMessageToClient] Waiting for WhatsApp client to be ready...`);
    const client = await getWhatsAppClient();
    console.log(`[sendMessageToClient] WhatsApp client ready, checking registration for ${chatId}...`);
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
        console.error('Number is not registered on WhatsApp:', clientObj.phone);
        throw new Error('Number is not registered on WhatsApp');
    }

    console.log(`[sendMessageToClient] Sending message to ${chatId}: ${message}`);
    await client.sendMessage(chatId, message);

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
