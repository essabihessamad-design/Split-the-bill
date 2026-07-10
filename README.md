# SplitReceipt Free - AI Receipt Scanner & Bill Splitter

An AI-powered, high-precision receipt scanner and itemized bill splitter. Simply snap a photo of any restaurant or grocery bill, let the AI extract all line-items and totals in seconds, and split items interactively with your friends.

---

## ⚡ 3-Step Setup

Follow these simple steps to run **SplitReceipt Free** locally:

### 1. Install Dependencies
Run the package installation command to download all required frontend and backend assets:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` into a new `.env` file at the root level and insert your API keys:
```bash
cp .env.example .env
```
*(Note: Fill in `GEMINI_API_KEY` for the AI receipt scanning. It is automatically injected in the AI Studio environment, so no manual configuration is needed there!)*

### 3. Launch Development Server
Boot up both the Express server backend and the interactive Vite frontend simultaneously on port 3000:
```bash
npm run dev
```

---

## 🚀 Key Features

- **Seamless AI Scanner (No Manual Input)**: Powered by Gemini Flash (`gemini-3.5-flash`), scans and parses items, currencies, prices, and dates in under 10 seconds.
- **Privacy First (No Database, No Login)**: All split history is securely stored on your device's `localStorage` (retains the last 3 receipts).
- **Proportional Fee Balancing**: Automatically distributes local service charges, tax percentages, or tips proportionally among all guests.
- **Dynamic Link Sharing**: Create dynamic base64-encoded bill links to share the interactive state with friends instantly without saving any database records.
- **WhatsApp Share Prompts**: Generate individual direct WhatsApp links containing custom Arabic message prompts: *"فاتورتنا من Carrefour: أنت عليك 85 MAD"* alongside the URL split detail.
