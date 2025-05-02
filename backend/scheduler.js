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
exports.SafeScheduler = void 0;
var templateEngine_1 = require("./templateEngine");
var SafeScheduler = /** @class */ (function () {
    function SafeScheduler(clients, templates, addEmojis) {
        this.timer = null;
        this.nextMessageInfo = {};
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
    SafeScheduler.prototype.start = function () {
        this.state.paused = false;
        this.scheduleNext();
    };
    SafeScheduler.prototype.pause = function () {
        this.state.paused = true;
        if (this.timer)
            clearTimeout(this.timer);
    };
    SafeScheduler.prototype.scheduleNext = function () {
        var _this = this;
        if (this.state.paused)
            return;
        // Daily limit
        var DAILY_LIMIT = 30;
        if (this.state.sentCount >= DAILY_LIMIT) {
            console.log("[SafeScheduler] Daily limit of ".concat(DAILY_LIMIT, " reached. Scheduler paused for 24h."));
            this.state.paused = true;
            this.timer = setTimeout(function () {
                _this.state.phase = 1;
                _this.state.sentCount = 0;
                _this.state.startTime = Date.now();
                _this.state.paused = false;
                _this.scheduleNext();
            }, 24 * 60 * 60 * 1000);
            return;
        }
        var delay = 0;
        // After every 10 messages, wait 40–60 minutes
        if (this.state.sentCount > 0 && this.state.sentCount % 10 === 0) {
            delay = 40 * 60 * 1000 + Math.floor(Math.random() * (20 * 60 * 1000)); // 40-60 min
        }
        else {
            delay = 3 * 60 * 1000 + Math.floor(Math.random() * (2 * 60 * 1000)); // 3-5 min
        }
        // Find next client for info
        var client = this.clients.find(function (c) { return !c.lastSent; });
        this.nextMessageInfo = client ? { clientId: client.id, delayMs: delay } : {};
        this.timer = setTimeout(function () { return _this.sendNext(); }, delay);
    };
    SafeScheduler.prototype.sendNext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, templates, template, msg, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.state.paused)
                            return [2 /*return*/];
                        // Phase transitions
                        if (this.state.phase === 1 && this.state.sentCount >= 10) {
                            this.state.phase = 2;
                            this.state.lastSent = Date.now();
                            // Pause for 1 hour
                            this.timer = setTimeout(function () { return _this.scheduleNext(); }, 60 * 60 * 1000);
                            return [2 /*return*/];
                        }
                        if (Date.now() - this.state.startTime > 24 * 60 * 60 * 1000) {
                            this.state.phase = 1;
                            this.state.sentCount = 0;
                            this.state.startTime = Date.now();
                        }
                        client = this.clients.find(function (c) { return !c.lastSent; });
                        if (!client)
                            return [2 /*return*/];
                        templates = (0, templateEngine_1.getShuffledTemplates)(this.templates, this.state.lastTemplateId);
                        template = templates[0];
                        this.state.lastTemplateId = template.id;
                        msg = (0, templateEngine_1.personalizeTemplate)(template, client, this.addEmojis);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        if (!this.sendFunction) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.sendFunction(client, template, msg)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        client.lastSent = new Date().toISOString();
                        this.logs.push({
                            phone: client.phone,
                            templateId: template.id,
                            sentAt: client.lastSent,
                            status: 'SENT',
                        });
                        this.state.sentCount++;
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        this.logs.push({
                            phone: client.phone,
                            templateId: template.id,
                            sentAt: new Date().toISOString(),
                            status: 'ERROR',
                            error: err_1.message
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        this.scheduleNext();
                        return [2 /*return*/];
                }
            });
        });
    };
    SafeScheduler.prototype.getStats = function () {
        return {
            phase: this.state.phase,
            sentCount: this.state.sentCount,
            nextIn: this.timer ? Math.max(0, this.timer._idleStart + this.timer._idleTimeout - Date.now()) : 0,
            nextMessageInfo: this.nextMessageInfo
        };
    };
    return SafeScheduler;
}());
exports.SafeScheduler = SafeScheduler;
