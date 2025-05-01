declare module 'qrcode-terminal' {
    export function generate(qr: string, opts?: { small?: boolean }): void;
}
