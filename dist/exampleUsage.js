"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const templateEngine_1 = require("./backend/templateEngine");
const clients = [
    { id: '1', name: 'Alice', phone: '2521234567890' },
    // ...more clients...
];
const templates = [
    { id: 't1', text: 'Asalamu Caleykum {{name}}, magacaygu waa Haji. Baaritaan gaaban ayaan sameynayaa oo ku saabsan ganacsiga. Ma ii oggolaan kartaa dhowr daqiiqo oo aan ku weydiiyo su’aalo kooban?' },
    // ...more templates...
];
const shuffledTemplates = (0, templateEngine_1.getShuffledTemplates)(templates);
const message = (0, templateEngine_1.personalizeTemplate)(shuffledTemplates[0], clients[0], true);
// ...send message...
