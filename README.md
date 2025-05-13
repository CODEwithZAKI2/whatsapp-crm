# WhatsApp CRM Automation

A Node.js/TypeScript web app to automate personalized WhatsApp messaging to clients, with human-like scheduling, opt-in/out support, attachments, and anti-ban safety features.

---

## Features

- **Web-based UI** for sending and viewing WhatsApp messages, attachments, and chat history.
- **Send personalized WhatsApp messages** to clients from a database or CSV.
- **Send attachments** (images, PDF files) and voice messages directly from the UI.
- **Message templates** with variable substitution (e.g., `{{name}}`).
- **Humanized scheduler**: random delays between messages and batches to mimic human behavior.
- **Daily sending limit** and batch pausing to avoid WhatsApp bans.
- **Opt-in/out support** for clients.
- **Persistent sent log** to avoid duplicate messaging.
- **Stats and logs** for sent and failed messages.

---

## Project Structure

```
whatsapp-crm/
│
├── backend/
│   ├── csvUtils.ts         # CSV loading and parsing logic
│   ├── scheduler.ts        # Scheduler logic
│   ├── templateEngine.ts   # Message template logic
│   └── types.ts            # TypeScript types
│
├── data/
│   ├── clients.csv         # List of clients (id, name, phone, optIn)
│   ├── templates.csv       # Message templates (id, text)
│   └── sentLog.json        # Persistent log of sent messages
│
├── backend/voices/         # Uploaded voice messages
├── backend/attachments/    # Uploaded attachments (images, PDFs)
├── ui/                     # Frontend UI (HTML, CSS, JS)
│   ├── client_messages.html # Chat UI for client conversations
│   └── index.html           # Main dashboard UI
├── dist/                   # Compiled JS output
├── server.ts               # Main backend server (Express)
├── package.json
├── tsconfig.json
└── README.md
```

---

## How to Use

### 1. Prerequisites

- Node.js v18 or later
- WhatsApp account (with WhatsApp Web access)
- [ffmpeg](https://ffmpeg.org/) installed and available in your system PATH (for voice messages)

### 2. Install Dependencies

```sh
npm install
```

### 3. Prepare Your Data

- Edit `data/clients.csv` with your client list:
  ```
  id,name,phone,optIn
  1,John Doe,1234567890,true
  2,Jane Smith,9876543210,true
  ```
- Edit `data/templates.csv` with your message templates:
  ```
  id,text
  t1,"Hello {{name}}, this is a test message."
  t2,"Hi {{name}}, hope you're well!"
  ```

### 4. Compile TypeScript

```sh
npx tsc
```

### 5. Start the Backend Server

```sh
node dist/server.js
```

- On first run, scan the QR code with WhatsApp on your phone (shown in the backend logs).

### 6. Open the Web UI

- Go to [http://localhost:3000/](http://localhost:3000/) in your browser.

---

## Web UI Overview

- **Send Message Tab**: Select a client and template, then send a WhatsApp message.
- **Scheduler Tab**: Start/stop the scheduler to send messages automatically with human-like delays.
- **Clients Tab**: View, add, edit, or delete clients.
- **Templates Tab**: View, add, edit, or delete message templates.
- **Sent Log Tab**: View the log of sent messages, filter by status, and search.

### Chat UI (`/ui/client_messages.html`)

- View chat history with a client, including:
  - **Text messages**
  - **Voice messages** (playable audio)
  - **Image attachments** (displayed inline)
  - **PDF and file attachments** (downloadable links)
- **Send text, voice, image, or PDF messages** directly from the chat UI.
- **Record and send voice messages** using your browser's microphone.
- **Send attachments** (images, PDFs) using the 📁 button.

---

## Sending Attachments & Voice Messages

- **To send an image or PDF**: Click the 📁 button, select a file, and (optionally) add a caption.
- **To send a voice message**: Click the 🎙️ button to start/stop recording, then send.
- **All attachments and voice messages** are sent via WhatsApp and shown in the chat history.

---

## Safety & Anti-Ban Tips

- **Do not exceed the daily limit** (default: 30 messages/day).
- **Use multiple templates** and personalize messages.
- **Avoid links and spammy content**.
- **Respect opt-outs** (set `optIn` to `false` in `clients.csv`).
- **Monitor for WhatsApp warnings** and stop the bot if detected.

---

## Troubleshooting

- **No eligible clients**: Check `sentLog.json` and `optIn` status in `clients.csv`.
- **CSV errors**: Ensure all fields with commas are quoted.
- **WhatsApp not connecting**: Make sure you scan the QR code and your phone stays online.
- **Voice/attachment errors**: Ensure `ffmpeg` is installed and in your PATH.

---

## Customization

- **Change daily limit**: Edit the `DAILY_LIMIT` constant in the scheduler.
- **Adjust delays**: Modify the random delay logic in the scheduler.
- **Add more templates**: Increase variety for better safety.

---

## Contributing

Pull requests and suggestions are welcome!  
Please open an issue for bugs or feature requests.

---

## License

MIT

---

**Questions?**  
Open an issue or ask for help!