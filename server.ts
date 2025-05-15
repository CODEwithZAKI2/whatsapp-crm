import express = require('express');
import bodyParser = require('body-parser');
import path = require('path');
import fs = require('fs');
import http = require('http');
import { Server as SocketIOServer, Socket } from 'socket.io';
import { sendMessageToClient, getWhatsAppClient } from './backend/sendMessage';
import { loadClientsFromCSV, loadTemplatesFromCSV } from './backend/csvUtils';
import { SafeScheduler } from './backend/scheduler';
import { pool } from './backend/db';
const multer = require('multer'); // Fix multer import for CommonJS compatibility
import type { Request } from 'express';
import { MessageMedia } from 'whatsapp-web.js';

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

// Serve sound files
app.use('/sound', express.static(path.join(__dirname, 'sound')));

// Serve static files
app.use(express.static(uiPath));

// Serve index.html for the root route
app.get('/', (req, res): Promise<any> => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found on server');
    }
    return Promise.resolve();
});

// --- CLIENTS CRUD ---
function saveClients(clients: any[]) {
    const csv = ['id,name,phone,optIn', ...clients.map(c =>
        `${c.id},${c.name},${c.phone},${c.optIn}`)].join('\n');
    fs.writeFileSync(CLIENTS_CSV, csv, 'utf8');
}

// Only update the GET /clients endpoint to use MySQL
app.get('/clients', async (req, res): Promise<any> => {
    try {
        const [rows] = await pool.query('SELECT id, name, contact_numbers, optIn FROM persons');
        const clients = (rows as any[]).map(row => {
            let phone = '';
            try {
                const numbers = JSON.parse(row.contact_numbers);
                if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
                    phone = numbers[0].value;
                }
            } catch {
                phone = '';
            }
            return {
                id: row.id.toString(),
                name: row.name,
                phone,
                optIn: !!row.optIn // Use the value from the database, ensure boolean
            };
        });
        res.json({ clients });
    } catch (err) {
        console.error('Error fetching clients from MySQL:', err);
        res.json({ clients: [] });
    }
});

app.post('/clients', async (req, res): Promise<any> => {
    const { name, phone, optIn } = req.body;
    try {
        // Insert new client into the database
        const contact_numbers = JSON.stringify([{ value: phone, label: 'work' }]);
        const [result]: any = await pool.query(
            'INSERT INTO persons (name, contact_numbers, optIn) VALUES (?, ?, ?)',
            [name, contact_numbers, optIn ? 1 : 0]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error inserting client:', err);
        res.json({ success: false, message: 'Failed to add client' });
    }
});

app.put('/clients/:id', async (req, res): Promise<any> => {
    const { name, phone, optIn } = req.body;
    const id = req.params.id;
    try {
        // Update client in the database
        const contact_numbers = JSON.stringify([{ value: phone, label: 'work' }]);
        await pool.query(
            'UPDATE persons SET name = ?, contact_numbers = ?, optIn = ? WHERE id = ?',
            [name, contact_numbers, optIn ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating client:', err);
        res.json({ success: false, message: 'Failed to update client' });
    }
});

app.delete('/clients/:id', async (req, res): Promise<any> => {
    const id = req.params.id;
    try {
        // Delete client from the database
        await pool.query('DELETE FROM persons WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting client:', err);
        res.json({ success: false, message: 'Failed to delete client' });
    }
});

// --- TEMPLATES CRUD ---
function saveTemplates(templates: any[]) {
    const csv = ['id,text', ...templates.map(t =>
        `${t.id},"${(t.text || '').replace(/"/g, '""')}"`)].join('\n');
    fs.writeFileSync(TEMPLATES_CSV, csv, 'utf8');
}
app.get('/templates', (req, res): Promise<any> => {
    const templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    res.json({ templates });
    return Promise.resolve();
});
app.post('/templates', (req, res): Promise<any> => {
    let templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    const { text } = req.body;
    // Generate unique template id like t8, t9, etc.
    let lastIdNum = 0;
    if (templates.length > 0) {
        // Find the max numeric part of ids like t8, t9, etc.
        lastIdNum = Math.max(
            ...templates
                .map(t => typeof t.id === 'string' && t.id.startsWith('t') ? parseInt(t.id.slice(1)) : 0)
                .filter(n => !isNaN(n))
        );
    }
    const id = `t${lastIdNum + 1}`;
    templates.push({ id, text });
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});
app.put('/templates/:id', (req, res): Promise<any> => {
    let templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    const { text } = req.body;
    templates = templates.map(t => t.id === req.params.id ? { ...t, text } : t);
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});
app.delete('/templates/:id', (req, res): Promise<any> => {
    let templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    templates = templates.filter(t => t.id !== req.params.id);
    saveTemplates(templates);
    res.json({ success: true });
    return Promise.resolve();
});

// --- SEND MESSAGE ---
app.post('/send-message', async (req, res): Promise<any> => {
    const { clientId, templateId } = req.body;
    try {
        // Fetch client from database
        const [rows] = await pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId]);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const client = rows[0];
        // Call sendMessageToClient with only two arguments as expected
        const result = await sendMessageToClient(client.id.toString(), templateId);
        res.json({ success: true, message: 'Message sent successfully!', result });
    } catch (error) {
        let errorMsg = 'Unknown error';
        if (error instanceof Error) {
            errorMsg = error.message;
        }
        res.status(500).json({ success: false, message: 'Failed to send message', error: errorMsg });
    }
    return Promise.resolve();
});

app.post('/send-message-activity', async (req, res): Promise<any> => {
    const { clientId, templateId, leadId, userId } = req.body;
    try {
        // Check if user exists
        const [userRows]: any = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (!Array.isArray(userRows) || userRows.length === 0) {
            return res.status(400).json({ success: false, message: `User ID ${userId} does not exist in users table.` });
        }

        // Fetch client from database
        const [rows] = await pool.query('SELECT id, name, contact_numbers, optIn FROM persons WHERE id = ?', [clientId]);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const client = rows[0];

        // Get template text
        const templates = require('./backend/csvUtils').loadTemplatesFromCSV(
            require('path').join(__dirname, 'data/templates.csv')
        );
        let template = templates.find((t: any) => t.id === templateId);
        if (!template) {
            template = templates[0];
        }

        // --- Personalize message for DB storage ---
        let message = template.text;
        if (client.name) {
            message = message.replace(/{{\s*name\s*}}/gi, client.name);
        }

        // --- Use China timezone for created_at and updated_at ---
        // Use Intl.DateTimeFormat for accurate China time
        function getChinaTimeString() {
            const now = new Date();
            // Format to 'YYYY-MM-DD HH:mm:ss' in Asia/Shanghai timezone
            const formatter = new Intl.DateTimeFormat('en-CA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Shanghai'
            });
            const parts = formatter.formatToParts(now).reduce((acc, part) => {
                if (part.type !== 'literal') acc[part.type] = part.value;
                return acc;
            }, {} as Record<string, string>);
            return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
        }
        const formattedNow = getChinaTimeString();
        console.log('[China Time for activity]:', formattedNow);

        const [activityResult]: any = await pool.query(
            'INSERT INTO activities (user_id, title, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [userId, 'Whatsapp: Sent message', message, formattedNow, formattedNow]
        );
        const activityId = activityResult.insertId;

        // Insert into lead_activities
        await pool.query(
            'INSERT INTO lead_activities (activity_id, lead_id) VALUES (?, ?)',
            [activityId, leadId]
        );

        // Send WhatsApp message
        const result = await sendMessageToClient(client.id.toString(), templateId);

        res.json({ success: true, message: 'Message sent and activity stored!', activityId, result });
    } catch (error) {
        let errorMsg = 'Unknown error';
        if (error instanceof Error) errorMsg = error.message;
        console.error('send-message-activity error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message or store activity', error: errorMsg });
    }
    return Promise.resolve();
});

// --- SEND VOICE MESSAGE ---
const voicesDir = path.join(__dirname, 'backend', 'voices');
if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir, { recursive: true });
const upload = multer({ dest: voicesDir });

app.post('/send-voice-message', upload.single('voice'), async (req: Request & { file?: Express.Multer.File }, res): Promise<any> => {
    try {
        const { clientId, phonenumber, leadId, userId, convert } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No voice file uploaded' });
        }
        // Accept .mp4 but always convert to WhatsApp-compatible .ogg/opus
        let ext = '';
        if (req.file.originalname.endsWith('.webm')) ext = '.webm';
        else if (req.file.originalname.endsWith('.ogg')) ext = '.ogg';
        else if (req.file.originalname.endsWith('.wav')) ext = '.wav';
        else if (req.file.originalname.endsWith('.mp3')) ext = '.mp3';
        else if (req.file.originalname.endsWith('.m4a')) ext = '.m4a';
        else if (req.file.originalname.endsWith('.mp4')) ext = '.mp4';
        else ext = path.extname(req.file.originalname) || '.webm';

        const newPath = req.file.path + ext;
        fs.renameSync(req.file.path, newPath);

        // Find client phone
        let phone = phonenumber;
        if (!phone && clientId) {
            const [rows]: any = await pool.query('SELECT contact_numbers FROM persons WHERE id = ?', [clientId]);
            if (Array.isArray(rows) && rows.length > 0) {
                try {
                    const numbers = JSON.parse(rows[0].contact_numbers);
                    if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
                        phone = numbers[0].value;
                    }
                } catch {}
            }
        }
        if (!phone) return res.status(400).json({ success: false, message: 'No phone number found' });
        const chatId = phone + '@c.us';

        // --- Check file size and type before sending ---
        const stat = fs.statSync(newPath);
        if (stat.size > 16 * 1024 * 1024) {
            fs.unlinkSync(newPath);
            return res.status(400).json({ success: false, message: 'Voice message is too large (max 16MB)' });
        }
        // Accept mp4/m4a but always convert
        const allowedExts = ['.webm', '.ogg', '.wav', '.mp3', '.m4a', '.mp4'];
        if (!allowedExts.includes(ext)) {
            fs.unlinkSync(newPath);
            return res.status(400).json({ success: false, message: 'Unsupported audio format' });
        }

        // --- Always convert to WhatsApp-compatible OGG/Opus ---
        let sendPath = newPath;
        let converted = false;
        const oggPath = newPath.replace(ext, '.ogg');
        try {
            const ffmpeg = require('fluent-ffmpeg');
            const ffmpegPath = 'C:\\ffmpeg\\ffmpeg-2025-05-07-git-1b643e3f65-full_build\\bin\\ffmpeg.exe';
            ffmpeg.setFfmpegPath(ffmpegPath);
            // --- WhatsApp expects: mono, 16kHz or 48kHz, opus codec, .ogg container ---
            await new Promise<void>((resolve, reject) => {
                ffmpeg(newPath)
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .audioCodec('libopus')
                    .format('ogg')
                    .outputOptions([
                        '-application', 'voip', // WhatsApp prefers voip profile
                        '-b:a', '32k',         // Lower bitrate for voice note
                        '-compression_level', '10',
                        '-vn' // ensure no video stream
                    ])
                    .on('start', (cmd: string) => {
                        console.log('ffmpeg command:', cmd);
                    })
                    .on('end', () => {
                        console.log('ffmpeg conversion finished:', oggPath);
                        resolve();
                    })
                    .on('error', (err: any) => {
                        console.error('ffmpeg conversion error:', err);
                        reject(err);
                    })
                    .save(oggPath);
            });
            sendPath = oggPath;
            converted = true;
        } catch (err) {
            console.error('ffmpeg conversion failed:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to convert audio to WhatsApp-compatible format. Make sure ffmpeg is installed and available in your PATH, or set the correct ffmpeg path in server.ts.',
                error: err instanceof Error ? err.message : String(err)
            });
        }

        // --- Try sending as voice note (PTT) ---
        const media = await MessageMedia.fromFilePath(sendPath);
        const client = await getWhatsAppClient();

        try {
            await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
        } catch (err) {
            console.error('sendAudioAsVoice failed, trying as normal audio:', err);
            try {
                await client.sendMessage(chatId, media);
            } catch (err2) {
                console.error('Sending as normal audio also failed:', err2);
                return res.status(500).json({ success: false, message: 'Failed to send voice message (WhatsApp rejected the file)', error: err2 instanceof Error ? err2.message : String(err2) });
            }
        }

        // Clean up temp files
        try {
            fs.unlinkSync(newPath);
            if (converted && sendPath !== newPath && fs.existsSync(sendPath)) {
                fs.unlinkSync(sendPath);
            }
        } catch {}

        res.json({ success: true, message: 'Voice message sent!' });
    } catch (err: unknown) {
        let errorMsg = 'Unknown error';
        if (err instanceof Error) errorMsg = err.message;
        console.error('send-voice-message error:', err);
        res.status(500).json({ success: false, message: 'Failed to send voice message', error: errorMsg });
    }
    return Promise.resolve();
});

// --- SEND ATTACHMENT (PDF or IMAGE) ---
const attachmentsDir = path.join(__dirname, 'backend', 'attachments');
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
const attachmentUpload = multer({ dest: attachmentsDir });

app.post('/send-attachment', attachmentUpload.single('attachment'), async (req: Request & { file?: Express.Multer.File }, res): Promise<any> => {
    try {
        const { phonenumber, clientId, caption } = req.body;
        let phone = phonenumber;
        if (!phone && clientId) {
            const [rows]: any = await pool.query('SELECT contact_numbers FROM persons WHERE id = ?', [clientId]);
            if (Array.isArray(rows) && rows.length > 0) {
                try {
                    const numbers = JSON.parse(rows[0].contact_numbers);
                    if (Array.isArray(numbers) && numbers.length > 0 && numbers[0].value) {
                        phone = numbers[0].value;
                    }
                } catch {}
            }
        }
        if (!phone) return res.status(400).json({ success: false, message: 'No phone number found' });
        const chatId = phone + '@c.us';

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No attachment uploaded' });
        }

        // Only allow images and pdfs
        const allowedMime = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp'
        ];
        if (!allowedMime.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Unsupported file type' });
        }

        // Add extension for correct file type
        let ext = '';
        if (req.file.mimetype === 'application/pdf') ext = '.pdf';
        else if (req.file.mimetype === 'image/png') ext = '.png';
        else if (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/jpg') ext = '.jpg';
        else if (req.file.mimetype === 'image/gif') ext = '.gif';
        else if (req.file.mimetype === 'image/webp') ext = '.webp';
        else ext = path.extname(req.file.originalname);

        const newPath = req.file.path + ext;
        fs.renameSync(req.file.path, newPath);

        const media = await MessageMedia.fromFilePath(newPath);
        const client = await getWhatsAppClient();
        await client.sendMessage(chatId, media, caption ? { caption } : undefined);

        res.json({ success: true, message: 'Attachment sent!' });
    } catch (err: unknown) {
        let errorMsg = 'Unknown error';
        if (err instanceof Error) errorMsg = err.message;
        console.error('send-attachment error:', err);
        res.status(500).json({ success: false, message: 'Failed to send attachment', error: errorMsg });
    }
    return Promise.resolve();
});

// --- SENT LOG ENDPOINT ---
app.get('/sent-log', (req, res): Promise<any> => {
    const sentLogPath = path.resolve(__dirname, 'data', 'sentLog.json');
    try {
        if (!fs.existsSync(sentLogPath)) {
            fs.writeFileSync(sentLogPath, '[]', 'utf8');
        }
        const sentLog = JSON.parse(fs.readFileSync(sentLogPath, 'utf8'));
        res.json({ sentLog });
    } catch (err) {
        console.error('Error reading sentLog.json:', err);
        res.json({ sentLog: [] });
    }
    return Promise.resolve();
});

// --- SCHEDULER ---
let scheduler: any = null;
let schedulerStartTimeout: NodeJS.Timeout | null = null;

app.post('/start-scheduler', async (req, res): Promise<any> => {
    if (scheduler && scheduler.state && !scheduler.state.paused) {
        res.json({ success: false, message: 'Scheduler already running.' });
        return;
    }
    const clients = loadClientsFromCSV(CLIENTS_CSV);
    const templates = loadTemplatesFromCSV(TEMPLATES_CSV);
    scheduler = new SafeScheduler(clients, templates, true);
    scheduler.sendFunction = async (clientObj: any, template: any, msg: any) => {
        try {
            await sendMessageToClient(clientObj.id, template.id);
            console.log(`Scheduler: Message sent to client ${clientObj.id} using template ${template.id}`);
        } catch (err) {
            console.error(`Scheduler: Failed to send message to client ${clientObj.id}:`, err);
            throw err;
        }
    };

    if (schedulerStartTimeout) {
        clearTimeout(schedulerStartTimeout);
        schedulerStartTimeout = null;
    }
    const { startTime } = req.body;
    if (startTime) {
        const startTimestamp = new Date(startTime).getTime();
        const now = Date.now();
        if (startTimestamp > now) {
            const delay = startTimestamp - now;
            console.log(`[Scheduler] Will start at ${startTime} (in ${Math.round(delay / 1000)} seconds)`);
            schedulerStartTimeout = setTimeout(() => {
                scheduler.start();
            }, delay);
            res.json({ success: true, message: `Scheduler will start at ${startTime}` });
            return;
        }
    }
    scheduler.start();
    res.json({ success: true, message: 'Scheduler started!' });
    return Promise.resolve();
});

app.post('/stop-scheduler', async (req, res): Promise<any> => {
    if (scheduler) {
        scheduler.pause();
        if (schedulerStartTimeout) {
            clearTimeout(schedulerStartTimeout);
            schedulerStartTimeout = null;
        }
        res.json({ success: true, message: 'Scheduler stopped.' });
    } else {
        res.json({ success: false, message: 'Scheduler is not running.' });
    }
    return Promise.resolve();
});

app.get('/scheduler-status', async (req, res): Promise<any> => {
    if (!scheduler) {
        res.json({ running: false });
        return;
    }
    const stats = scheduler.getStats();
    res.json({
        running: !scheduler.state.paused,
        sentCount: stats.sentCount,
        nextMessageInfo: stats.nextMessageInfo
    });
    return Promise.resolve();
});

// --- MESSAGES FROM OPEN CHATS ---
app.get('/current-messages', async (req, res): Promise<any> => {
    try {
        const client = await getWhatsAppClient();
        const chats = await client.getChats();
        let allMessages: any[] = [];
        for (const chat of chats) {
            const messages = await chat.fetchMessages({ limit: 50 });
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
    } catch (err) {
        let errorMsg = 'Unknown error';
        if (err instanceof Error) errorMsg = err.message;
        res.status(500).json({ messages: [], error: errorMsg });
    }
    return Promise.resolve();
});

// --- CHAT HISTORY ENDPOINT ---
app.get('/chat-history', async (req, res): Promise<any> => {
    const phone = req.query.phonenumber as string;
    if (!phone) {
        res.json({ messages: [] });
        return;
    }
    try {
        const client = await getWhatsAppClient();
        const chatId = phone + '@c.us';
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 50 });
        const formatted = await Promise.all(messages.map(async msg => {
            // Voice messages
            if (msg.type === 'audio' || msg.type === 'ptt') {
                try {
                    const media = await msg.downloadMedia();
                    if (media && media.data) {
                        return {
                            fromMe: msg.fromMe,
                            body: '[Voice message]',
                            timestamp: msg.timestamp,
                            id: msg.id._serialized,
                            type: msg.type,
                            base64: media.data,
                            mimetype: media.mimetype || 'audio/ogg'
                        };
                    }
                } catch {}
                return {
                    fromMe: msg.fromMe,
                    body: '[Voice message]',
                    timestamp: msg.timestamp,
                    id: msg.id._serialized,
                    type: msg.type
                };
            }
            // Image attachments
            else if (msg.type === 'image') {
                try {
                    const media = await msg.downloadMedia();
                    // @ts-ignore: WhatsApp web.js Message type may have caption
                    const caption = (msg as any).caption || '';
                    if (media && media.data) {
                        return {
                            fromMe: msg.fromMe,
                            body: '[Image]',
                            timestamp: msg.timestamp,
                            id: msg.id._serialized,
                            type: msg.type,
                            base64: media.data,
                            mimetype: media.mimetype || 'image/jpeg',
                            caption
                        };
                    }
                } catch {}
                // @ts-ignore
                const caption = (msg as any).caption || '';
                return {
                    fromMe: msg.fromMe,
                    body: '[Image]',
                    timestamp: msg.timestamp,
                    id: msg.id._serialized,
                    type: msg.type,
                    caption
                };
            }
            // Document attachments (e.g. PDF)
            else if (msg.type === 'document') {
                try {
                    const media = await msg.downloadMedia();
                    // @ts-ignore: WhatsApp web.js Message type may have filename/caption
                    const filename = (msg as any).filename || 'file';
                    // @ts-ignore
                    const caption = (msg as any).caption || '';
                    if (media && media.data) {
                        return {
                            fromMe: msg.fromMe,
                            body: '[Document]',
                            timestamp: msg.timestamp,
                            id: msg.id._serialized,
                            type: msg.type,
                            base64: media.data,
                            mimetype: media.mimetype || 'application/pdf',
                            filename,
                            caption
                        };
                    }
                } catch {}
                // @ts-ignore
                const filename = (msg as any).filename || 'file';
                // @ts-ignore
                const caption = (msg as any).caption || '';
                return {
                    fromMe: msg.fromMe,
                    body: '[Document]',
                    timestamp: msg.timestamp,
                    id: msg.id._serialized,
                    type: msg.type,
                    filename,
                    caption
                };
            }
            // Fallback: text and other types
            else {
                return {
                    fromMe: msg.fromMe,
                    body: msg.body,
                    timestamp: msg.timestamp,
                    id: msg.id._serialized,
                    type: msg.type
                };
            }
        }));
        res.json({ messages: formatted });
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.json({ messages: [] });
    }
    return Promise.resolve();
});

// Add endpoint to save activity for received message from frontend
app.post('/save-activity-receive', async (req, res): Promise<any> => {
    try {
        const { userId, leadId, comment } = req.body;
        if (!userId || !leadId || !comment) {
            return res.status(400).json({ success: false, message: 'Missing userId, leadId, or comment' });
        }
        // Format China time
        function getChinaTimeString() {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-CA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Shanghai'
            });
            const parts = formatter.formatToParts(now).reduce((acc, part) => {
                if (part.type !== 'literal') acc[part.type] = part.value;
                return acc;
            }, {} as Record<string, string>);
            return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
        }
        const formattedNow = getChinaTimeString();
        const [activityResult]: any = await pool.query(
            'INSERT INTO activities (user_id, title, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [userId, 'Whatsapp: Recieve message', comment, formattedNow, formattedNow]
        );
        const activityId = activityResult.insertId;
        await pool.query(
            'INSERT INTO lead_activities (activity_id, lead_id) VALUES (?, ?)',
            [activityId, leadId]
        );
        res.json({ success: true, activityId });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save activity', error: err instanceof Error ? err.message : String(err) });
    }
    return Promise.resolve();
});

// --- Log buffer and emit logic ---
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

const logBuffer: string[] = [];
function emitLog(msg: string) {
    logBuffer.push(msg);
    if (logBuffer.length > 200) logBuffer.shift();
    io.emit('backend-log', msg);
}

// Patch console.log/warn/error/info to also emit to frontend
(['log', 'warn', 'error', 'info'] as const).forEach(type => {
    const orig = (console as any)[type];
    (console as any)[type] = function(...args: any[]) {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        emitLog(`[${type.toUpperCase()}] ${msg}`);
        orig.apply(console, args);
    };
});

// Serve logs to new clients
io.on('connection', (socket: Socket) => {
    logBuffer.forEach(msg => socket.emit('backend-log', msg));
});

// Start server (use server.listen instead of app.listen)
server.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${uiPath}`);
    console.log(`Looking for index.html at: ${indexPath}`);
    if (!fs.existsSync(indexPath)) {
        console.error('ERROR: index.html not found at', indexPath);
    } else {
        console.log('index.html found!');
    }

    // --- Listen for incoming WhatsApp messages and log to activities ---
    try {
        const client = await getWhatsAppClient();
        client.on('message', async (msg: any) => {
            try {
                // Only log incoming messages (not fromMe)
                if (msg.fromMe) return;

                // Extract phone number (remove @c.us/@g.us)
                let phone = msg.from;
                if (phone.endsWith('@c.us')) phone = phone.replace('@c.us', '');
                else if (phone.endsWith('@g.us')) return; // Ignore group messages

                // Find person by phone in contact_numbers (search for value in JSON array)
                const [personRows]: any = await pool.query(
                    "SELECT id FROM persons WHERE JSON_SEARCH(contact_numbers, 'one', ?) IS NOT NULL",
                    [phone]
                );
                if (!Array.isArray(personRows) || personRows.length === 0) {
                    console.warn(`[Activity] No person found for incoming message from ${phone}`);
                    return;
                }

                // Find a user_id to associate (for demo, use 1 or first user)
                let userId = 1;
                try {
                    const [userRows]: any = await pool.query('SELECT id FROM users LIMIT 1');
                    if (Array.isArray(userRows) && userRows.length > 0) userId = userRows[0].id;
                } catch {}

                // Format China time
                function getChinaTimeString() {
                    const now = new Date();
                    const formatter = new Intl.DateTimeFormat('en-CA', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Shanghai'
                    });
                    const parts = formatter.formatToParts(now).reduce((acc, part) => {
                        if (part.type !== 'literal') acc[part.type] = part.value;
                        return acc;
                    }, {} as Record<string, string>);
                    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
                }
                const formattedNow = getChinaTimeString();

                // Compose message body (text, or [Voice message], etc.)
                let message = '';
                if (msg.type === 'chat') {
                    message = msg.body;
                } else if (msg.type === 'audio' || msg.type === 'ptt') {
                    message = '[Voice message]';
                } else if (msg.type === 'image') {
                    message = '[Image]' + ((msg as any).caption ? ' ' + (msg as any).caption : '');
                } else if (msg.type === 'document') {
                    message = '[Document]' + ((msg as any).filename ? ' ' + (msg as any).filename : '');
                } else {
                    message = `[${msg.type}]`;
                }

                await pool.query(
                    'INSERT INTO activities (user_id, title, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                    [userId, 'Whatsapp: Recieve message', message, formattedNow, formattedNow]
                );
                console.log(`[Activity] Saved incoming message from ${phone} to activities table.`);
            } catch (err) {
                console.error('[Activity] Failed to save incoming message to activities:', err);
            }
        });
    } catch (err) {
        console.error('Failed to set up WhatsApp message listener:', err);
    }
});
