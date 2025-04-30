# WhatsApp CRM Automation

A Node.js/TypeScript CLI tool to automate personalized WhatsApp messaging to clients, with human-like scheduling, opt-in/out support, and anti-ban safety features.

---

## Features

- **Send personalized WhatsApp messages** to clients from a CSV file.
- **Message templates** with variable substitution (e.g., `{{name}}`).
- **Humanized scheduler**: random delays between messages and batches to mimic human behavior.
- **Daily sending limit** and batch pausing to avoid WhatsApp bans.
- **Opt-in/out support** for clients.
- **Persistent sent log** to avoid duplicate messaging.
- **Interactive CLI menu** for manual or automated sending.
- **Stats and logs** for sent and failed messages.

---

## Project Structure

```
whatsapp-crm/
│
├── backend/
│   ├── csvUtils.ts         # CSV loading and parsing logic
│   ├── scheduler.ts        # (Optional) Scheduler logic
│   ├── templateEngine.ts   # Message template logic
│   └── types.ts            # TypeScript types
│
├── data/
│   ├── clients.csv         # List of clients (id, name, phone, optIn)
│   ├── templates.csv       # Message templates (id, text)
│   └── sentLog.json        # Persistent log of sent messages
│
├── dist/                   # Compiled JS output
│
├── sendMessages.ts         # Main CLI entry point
├── package.json
├── tsconfig.json
└── README.md
```

---

## How It Works

### 1. Data Loading

- **Clients** are loaded from clients.csv. Each client has an `id`, `name`, `phone`, and optional `optIn` field.
- **Templates** are loaded from templates.csv. Each template has an `id` and `text` (with variables like `{{name}}`).
- **Sent log** is loaded from sentLog.json to track which clients have already been messaged.

### 2. WhatsApp Connection

- Uses `whatsapp-web.js` to connect to WhatsApp Web.
- On first run, scan the QR code with your WhatsApp mobile app.

### 3. CLI Menu

- **Show Clients**: View all loaded clients.
- **Show Templates**: View all message templates.
- **Show Sent Messages**: View the log of sent messages.
- **Show Stats**: See total, sent, and error counts.
- **Send Next Message**: Manually send to the next eligible client.
- **Start Scheduler**: Automatically send to all eligible clients with humanized delays.
- **Exit**: Save logs and exit.

### 4. Sending Logic

- Only sends to clients who:
  - Are opted in (`optIn !== false`)
  - Have a valid phone number
  - Have **not** already received a message (checked via `sentLog.json`)
- Messages are personalized using the template and client data.
- After each send, the log is updated immediately.

### 5. Scheduler

- Sends messages with a **random delay (2–5 minutes)** between each.
- After every 10 messages, waits a **random 40–60 minutes**.
- Stops for the day after reaching the **daily limit** (default: 30).
- All timings are randomized to mimic human behavior and avoid bans.

---

## How to Run

### 1. Prerequisites

- Node.js v18 or later
- WhatsApp account (with WhatsApp Web access)

### 2. Install Dependencies

```sh
npm install
```

### 3. Prepare Your Data

- Edit clients.csv with your client list:
  ```
  id,name,phone,optIn
  1,John Doe,1234567890,true
  2,Jane Smith,9876543210,true
  ```
- Edit templates.csv with your message templates:
  ```
  id,text
  t1,"Hello {{name}}, this is a test message."
  t2,"Hi {{name}}, hope you're well!"
  ```

### 4. Compile TypeScript

```sh
npx tsc
```

### 5. Start the App

```sh
node dist/sendMessages.js
```

- Scan the QR code with WhatsApp on your phone.
- Use the menu to send messages or start the scheduler.

---

## Safety & Anti-Ban Tips

- **Do not exceed the daily limit** (default: 30 messages/day).
- **Use multiple templates** and personalize messages.
- **Avoid links and spammy content**.
- **Respect opt-outs** (set `optIn` to `false` in `clients.csv`).
- **Monitor for WhatsApp warnings** and stop the bot if detected.

---

## Customization

- **Change daily limit**: Edit the `DAILY_LIMIT` constant in sendMessages.ts.
- **Adjust delays**: Modify the random delay logic in the scheduler.
- **Add more templates**: Increase variety for better safety.

---

## Troubleshooting

- **No eligible clients**: Check `sentLog.json` and `optIn` status in `clients.csv`.
- **CSV errors**: Ensure all fields with commas are quoted.
- **WhatsApp not connecting**: Make sure you scan the QR code and your phone stays online.

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