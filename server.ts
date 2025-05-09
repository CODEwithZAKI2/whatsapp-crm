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
            [userId, 'Whatsapp', message, formattedNow, formattedNow]
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
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${uiPath}`);
    console.log(`Looking for index.html at: ${indexPath}`);
    if (!fs.existsSync(indexPath)) {
        console.error('ERROR: index.html not found at', indexPath);
    } else {
        console.log('index.html found!');
    }
});
