# ⚡ GODOT AI FORGE

> AI-powered game dev assistant yang terhubung langsung ke Godot Engine.
> Buat file, tulis script, generate asset — semua dari satu tempat.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Godot](https://img.shields.io/badge/Godot-4.x-478CBF)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000)

---

## 🚀 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 💬 **AI Chat** | Chat dengan Gemini + Tavily web search real-time |
| 🎮 **Godot Workspace** | Buat, edit, hapus file & GDScript langsung |
| 🖼️ **Image Studio** | Generate asset game visual dengan Canva API |
| 🧠 **Super Memory** | Memori percakapan & project context via Firebase |
| 🔁 **Teknik Tumpuk** | Multi-step AI chaining: Plan→Search→Execute→Verify→Refine |
| 🔌 **Godot Plugin** | Editor addon GDScript yang sync real-time |

---

## 📁 Struktur Project

```
RHF.AI/
├── api/                    ← Vercel Serverless Functions (backend)
│   ├── chat.js             ← Chat Gemini + Tavily
│   ├── chain.js            ← Teknik tumpuk engine
│   ├── generate.js         ← Godot code generator
│   ├── files.js            ← File manager CRUD
│   ├── memory.js           ← Super memory system
│   ├── image.js            ← Canva image generator
│   └── search.js           ← Tavily web search
├── src/                    ← React frontend (coming soon)
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── store/
├── godot-plugin/           ← GDScript editor addon (coming soon)
├── index.html              ← Landing page
├── vite.config.js          ← Vite config
├── vercel.json             ← Vercel deploy config
├── package.json            ← Dependencies
└── .env.example            ← Template environment variables
```

---

## ⚙️ Setup & Instalasi

### 1. Clone repo

```bash
git clone https://github.com/RHF101/RHF.AI.git
cd RHF.AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
# Copy template
cp .env.example .env

# Edit .env dan isi semua API key
```

Isi `.env` dengan API key lo:

| Variable | Dari mana |
|----------|-----------|
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_TAVILY_API_KEY` | [Tavily](https://app.tavily.com) |
| `VITE_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) |
| `VITE_CANVA_PUBLIC_KEY` | [Canva Developers](https://www.canva.com/developers) |
| `VITE_CANVA_KID` | [Canva Developers](https://www.canva.com/developers) |

### 4. Jalankan dev server

```bash
npm run dev
# → http://localhost:5173
```

### 5. Build untuk production

```bash
npm run build
```

---

## 🌐 Deploy ke Vercel

### Cara 1: Via Vercel Dashboard (Recommended)

1. Push repo ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New Project**
3. Import repo `RHF101/RHF.AI`
4. **Settings → Environment Variables** → tambahkan semua variable dari `.env`
5. Klik **Deploy** ✅

### Cara 2: Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 🔌 API Endpoints

Semua endpoint ada di folder `/api/` dan otomatis jadi serverless function di Vercel.

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/chat` | POST | Chat dengan Gemini AI |
| `/api/chain` | POST | Teknik tumpuk multi-step |
| `/api/generate` | POST | Generate Godot code/file |
| `/api/files` | GET/POST/PUT/DELETE | CRUD file Godot |
| `/api/memory` | GET/POST | Super memory system |
| `/api/image` | POST | Generate image dengan Canva |
| `/api/search` | POST | Web search dengan Tavily |

---

## 🔧 Firebase Setup

1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. Aktifkan **Realtime Database**
3. Set rules (untuk development):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
4. Aktifkan **Storage**
5. Copy config ke `.env`

---

## 🎮 Godot Plugin (Coming Soon)

Plugin GDScript untuk editor Godot yang terhubung langsung ke web app.

```
godot-plugin/
├── plugin.cfg
├── ai_forge_plugin.gd
└── ai_forge_panel.gd
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Vercel Edge Functions
- **AI**: Google Gemini 2.0 Flash
- **Search**: Tavily API
- **Database**: Firebase Realtime DB
- **Storage**: Firebase Storage
- **Images**: Canva API
- **State**: Zustand
- **Deploy**: Vercel + GitHub

---

## 👤 Author

**RHF** — RHF101  
Repo: [github.com/RHF101/RHF.AI](https://github.com/RHF101/RHF.AI)

---

*Built with ⚡ GODOT AI FORGE*
