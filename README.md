# AI Assistant

A cybersecurity AI assistant with nmap integration, powered by Gemini and Claude.

## Requirements

- Python 3.11+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/MrChrisLia/AI-Assistant.git
cd AI-Assistant
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Gemini API key |
| `JWT_SECRET` | Yes | Any long random string (used to sign auth tokens) |
| `ADMIN_USERNAME` | Yes | Username that gets admin access |
| `ANTHROPIC_API_KEY` | No | Enables Claude model option in the UI |

Generate a secure `JWT_SECRET`:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Run the server

```bash
uvicorn main:app --reload
```

The app will be available at [http://localhost:8000](http://localhost:8000).

## First login

The admin account is created on first login — just sign in with the username you set in `ADMIN_USERNAME`. From the admin panel you can create accounts for other users.

## Nmap

Nmap must be installed on the system for scan commands to work:

- **macOS:** `brew install nmap`
- **Ubuntu/Debian:** `sudo apt install nmap`
- **Windows:** [nmap.org/download](https://nmap.org/download.html)
