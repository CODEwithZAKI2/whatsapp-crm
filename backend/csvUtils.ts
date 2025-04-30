import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Client, MessageTemplate } from './types';

export function loadClientsFromCSV(csvPath: string): Client[] {
    const content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    return records.map((r: any, idx: number) => ({
        id: r.id || String(idx + 1),
        name: r.name,
        phone: r.phone,
        optIn: r.optIn === undefined ? true : (r.optIn === 'true' || r.optIn === '1')
    })).map((c: Client) => ({ ...c, id: String(c.id) }));
}

export function loadTemplatesFromCSV(csvPath: string): MessageTemplate[] {
    const content = fs.readFileSync(path.resolve(csvPath), 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    return records.map((r: any, idx: number) => ({
        id: r.id || String(idx + 1),
        text: r.text
    }));
}
