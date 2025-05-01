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
exports.SafeScheduler = void 0;
const templateEngine_1 = require("./templateEngine");
class SafeScheduler {
    constructor(clients, templates, addEmojis) {
        this.timer = null;
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
        if (this.timer)
            clearTimeout(this.timer);
    }
    scheduleNext() {
        if (this.state.paused)
            return;
        let delay = 0;
        if (this.state.phase === 1) {
            delay = 90000 + Math.floor(Math.random() * 60000); // 90-150s
        }
        else if (this.state.phase === 2) {
            delay = 180000 + Math.floor(Math.random() * 120000); // 3-5min
        }
        else {
            delay = 24 * 60 * 60 * 1000; // 24h reset
        }
        this.timer = setTimeout(() => this.sendNext(), delay);
    }
    sendNext() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state.paused)
                return;
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
            if (!client)
                return;
            const templates = (0, templateEngine_1.getShuffledTemplates)(this.templates, this.state.lastTemplateId);
            const template = templates[0];
            this.state.lastTemplateId = template.id;
            const msg = (0, templateEngine_1.personalizeTemplate)(template, client, this.addEmojis);
            // WhatsApp send integration
            try {
                if (this.sendFunction) {
                    yield this.sendFunction(client, template, msg);
                }
                client.lastSent = new Date().toISOString();
                this.logs.push({
                    phone: client.phone,
                    templateId: template.id,
                    sentAt: client.lastSent,
                    status: 'SENT',
                });
                this.state.sentCount++;
            }
            catch (err) {
                this.logs.push({
                    phone: client.phone,
                    templateId: template.id,
                    sentAt: new Date().toISOString(),
                    status: 'ERROR',
                    error: err.message
                });
            }
            this.scheduleNext();
        });
    }
    getStats() {
        return {
            phase: this.state.phase,
            sentCount: this.state.sentCount,
            nextIn: this.timer ? Math.max(0, this.timer._idleStart + this.timer._idleTimeout - Date.now()) : 0,
        };
    }
}
exports.SafeScheduler = SafeScheduler;
