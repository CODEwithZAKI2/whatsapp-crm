"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalizeTemplate = personalizeTemplate;
exports.getShuffledTemplates = getShuffledTemplates;
var EMOJIS = ['😊', '🚀', '👍', '🙌', '🔥', '💡'];
function personalizeTemplate(template, client, addEmojis) {
    var msg = template.text
        .replace('{{name}}', client.name);
    // Randomize length ±10%
    var len = msg.length;
    var delta = Math.floor(len * 0.1);
    if (Math.random() > 0.5) {
        msg = msg + ' '.repeat(Math.floor(Math.random() * delta));
    }
    else {
        msg = msg.slice(0, len - Math.floor(Math.random() * delta));
    }
    // Optionally add 1-2 random emojis
    if (addEmojis) {
        var count = 1 + Math.floor(Math.random() * 2);
        for (var i = 0; i < count; i++) {
            msg += ' ' + EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        }
    }
    return msg;
}
// Shuffle templates, never repeat consecutively
function getShuffledTemplates(templates, lastTemplateId) {
    var _a, _b;
    var shuffled = templates.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [shuffled[j], shuffled[i]], shuffled[i] = _a[0], shuffled[j] = _a[1];
    }
    if (lastTemplateId && shuffled[0].id === lastTemplateId && shuffled.length > 1) {
        _b = [shuffled[1], shuffled[0]], shuffled[0] = _b[0], shuffled[1] = _b[1];
    }
    return shuffled;
}
