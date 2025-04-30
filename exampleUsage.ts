import { personalizeTemplate, getShuffledTemplates } from './backend/templateEngine';
import { MessageTemplate, Client } from './backend/types';

const clients: Client[] = [
    { id: '1', name: 'Alice', phone: '2521234567890' },
    // ...more clients...
];
const templates: MessageTemplate[] = [
    { id: 't1', text: 'Asalamu Caleykum {{name}}, magacaygu waa Haji. Baaritaan gaaban ayaan sameynayaa oo ku saabsan ganacsiga. Ma ii oggolaan kartaa dhowr daqiiqo oo aan ku weydiiyo su’aalo kooban?' },
    // ...more templates...
];

const shuffledTemplates = getShuffledTemplates(templates);
const message = personalizeTemplate(shuffledTemplates[0], clients[0], true);
// ...send message...