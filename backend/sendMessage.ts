import { Client, LocalAuth } from 'whatsapp-web.js';
import { loadClientsFromCSV, loadTemplatesFromCSV } from './csvUtils';
import { getShuffledTemplates, personalizeTemplate } from './templateEngine';
import { pool } from './db';
import fs = require('fs');
import path = require('path');
import qrcode = require('qrcode-terminal');

const CLIENTS_CSV = path.join(__dirname, '../data/clients.csv');
const TEMPLATES_CSV = path.join(__dirname, '../data/templates.csv');
const SENT_LOG_JSON = path.join(__dirname, '../data/sentLog.json');
const SESSION_FOLDER = path.join(__dirname, '..', '.wwebjs_auth'); // or your LocalAuth config

let whatsappClient: Client | null = null;
let isReady = false;

// Enhanced initialization with more logging and QR code
function initWhatsAppClient() {
    if (!whatsappClient) {
        // Ensure session folder exists for LocalAuth to persist session
        if (!fs.existsSync(SESSION_FOLDER)) {
            fs.mkdirSync(SESSION_FOLDER, { recursive: true });
        }
        console.log('[initWhatsAppClient] Creating WhatsApp client...');
        whatsappClient = new Client({
            authStrategy: new LocalAuth({ dataPath: SESSION_FOLDER }),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });
        whatsappClient.on('qr', (qr) => {
            // Only show QR if not authenticated
            if (!isReady && !fs.existsSync(path.join(SESSION_FOLDER, 'Default'))) {
                console.log('[initWhatsAppClient] QR code event fired. Scan this QR code with your WhatsApp:');
                qrcode.generate(qr, { small: true });
            } else {
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

    // Fetch client from DB
    const [clientRows]: any = await pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId]);
    if (!Array.isArray(clientRows) || clientRows.length === 0) {
        console.error('Client not found:', clientId);
        throw new Error('Client not found');
    }
    const clientObj = clientRows[0];
    let phone = '';
    try {
        const numbers = JSON.parse(clientObj.contact_numbers);
        if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
            phone = numbers[0].value;
        }
    } catch {
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

    // Load templates from CSV (or you can migrate this to DB as well)
    const templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    const sentLog = loadSentLog();

    let template = templates.find(t => t.id === templateId);
    if (!template) {
        const shuffled = getShuffledTemplates(templates);
        template = shuffled[0];
        console.warn('Template not found, using random template:', template.id);
    }

    // Personalize message
    const message = personalizeTemplate(template, { ...clientObj, phone }, true);
    const chatId = phone + '@c.us';

    if (!isReady) {
        console.error('[sendMessageToClient] WhatsApp client not ready. Please wait for initialization.');
        throw new Error('WhatsApp client not ready. Please wait for initialization.');
    }

    try {
        console.log(`[sendMessageToClient] Checking registration for ${chatId}...`);
        if (!whatsappClient) {
            throw new Error('WhatsApp client is not initialized.');
        }
        const isRegistered = await whatsappClient.isRegisteredUser(chatId);
        if (!isRegistered) {
            console.error('Number is not registered on WhatsApp:', phone);
            throw new Error('Number is not registered on WhatsApp');
        }

        console.log(`[sendMessageToClient] Sending message to ${chatId}: ${message}`);
        await whatsappClient.sendMessage(chatId, message);

        sentLog.push({
            clientId: clientObj.id,
            templateId: template.id,
            time: new Date().toISOString(),
            status: 'sent'
        });
        saveSentLog(sentLog);

        console.log(`[sendMessageToClient] Message sent to ${clientObj.name} (${phone})`);
        return { status: 'sent', client: clientObj.name, phone, template: template.text };
    } catch (err) {
        console.error('[sendMessageToClient] Error sending message:', err);
        throw err;
    }
}

export { getWhatsAppClient };
