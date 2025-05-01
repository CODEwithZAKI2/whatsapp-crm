import { Client, MessageTemplate, SentMessageLog } from './types';
import { personalizeTemplate, getShuffledTemplates } from './templateEngine';

type SchedulerState = {
    phase: 1 | 2 | 3;
    sentCount: number;
    lastSent: number;
    startTime: number;
    paused: boolean;
    lastTemplateId?: string;
};

export class SafeScheduler {
    private clients: Client[];
    private templates: MessageTemplate[];
    private logs: SentMessageLog[];
    private state: SchedulerState;
    private timer: NodeJS.Timeout | null = null;
    private addEmojis: boolean;
    public sendFunction?: (client: Client, template: MessageTemplate, msg: string) => Promise<void>;

    constructor(clients: Client[], templates: MessageTemplate[], addEmojis: boolean) {
        this.clients = clients;
        this.templates = templates;
        this.logs = [];
        this.state = {
            phase: 1,
            sentCount: 0,
            lastSent: Date.now(),
            startTime: Date.now(),
            paused: false,
            lastTemplateId: undefined,
        };
        this.addEmojis = addEmojis;
    }

    start() {
        this.state.paused = false;
        this.scheduleNext();
    }

    pause() {
        this.state.paused = true;
        if (this.timer) clearTimeout(this.timer);
    }

    private scheduleNext() {
        if (this.state.paused) return;

        let delay = 0;
        if (this.state.phase === 1) {
            delay = 90_000 + Math.floor(Math.random() * 60_000); // 90-150s
        } else if (this.state.phase === 2) {
            delay = 180_000 + Math.floor(Math.random() * 120_000); // 3-5min
        } else {
            delay = 24 * 60 * 60 * 1000; // 24h reset
        }

        this.timer = setTimeout(() => this.sendNext(), delay);
    }

    private async sendNext() {
        if (this.state.paused) return;

        // Phase transitions
        if (this.state.phase === 1 && this.state.sentCount >= 10) {
            this.state.phase = 2;
            this.state.lastSent = Date.now();
            // Pause for 1 hour
            this.timer = setTimeout(() => this.scheduleNext(), 60 * 60 * 1000);
            return;
        }
        if (Date.now() - this.state.startTime > 24 * 60 * 60 * 1000) {
            this.state.phase = 1;
            this.state.sentCount = 0;
            this.state.startTime = Date.now();
        }

        // Pick next client and template
        const client = this.clients.find(c => !c.lastSent);
        if (!client) return;

        const templates = getShuffledTemplates(this.templates, this.state.lastTemplateId);
        const template = templates[0];
        this.state.lastTemplateId = template.id;

        const msg = personalizeTemplate(template, client, this.addEmojis);

        // WhatsApp send integration
        try {
            if (this.sendFunction) {
                await this.sendFunction(client, template, msg);
            }
            client.lastSent = new Date().toISOString();
            this.logs.push({
                phone: client.phone,
                templateId: template.id,
                sentAt: client.lastSent,
                status: 'SENT',
            });
            this.state.sentCount++;
        } catch (err: any) {
            this.logs.push({
                phone: client.phone,
                templateId: template.id,
                sentAt: new Date().toISOString(),
                status: 'ERROR',
                error: err.message
            });
        }

        this.scheduleNext();
    }

    getStats() {
        return {
            phase: this.state.phase,
            sentCount: this.state.sentCount,
            nextIn: this.timer ? Math.max(0, (this.timer as any)._idleStart + (this.timer as any)._idleTimeout - Date.now()) : 0,
        };
    }
}