"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalizeTemplate = personalizeTemplate;
exports.getShuffledTemplates = getShuffledTemplates;
const EMOJIS = ['😊', '🚀', '👍', '🙌', '🔥', '💡'];
function personalizeTemplate(template, client, addEmojis) {
    let msg = template.text
        .replace('{{name}}', client.name);
    // Randomize length ±10%
    const len = msg.length;
    const delta = Math.floor(len * 0.1);
    if (Math.random() > 0.5) {
        msg = msg + ' '.repeat(Math.floor(Math.random() * delta));
    }
    else {
        msg = msg.slice(0, len - Math.floor(Math.random() * delta));
    }
    // Optionally add 1-2 random emojis
    if (addEmojis) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            msg += ' ' + EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        }
    }
    return msg;
}
// Shuffle templates, never repeat consecutively
function getShuffledTemplates(templates, lastTemplateId) {
    const shuffled = templates.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (lastTemplateId && shuffled[0].id === lastTemplateId && shuffled.length > 1) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
}
