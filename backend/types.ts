export interface Client {
    id: string;
    name: string;
    phone: string;
    optIn?: boolean; // true if user has opted in
    lastSent?: string;
    status?: string;
}

export interface MessageTemplate {
    id: string;
    text: string;
}

export interface SentMessageLog {
    phone: string;
    templateId: string;
    sentAt: string;
    status: string;
    error?: string;
}
