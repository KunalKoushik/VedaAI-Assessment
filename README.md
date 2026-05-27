# VedaAI - AI Assessment Creator

## Features
- Create assignments with custom question types
- AI-powered question paper generation using Groq LLM
- Real-time status updates via WebSocket
- Beautiful, responsive question paper output
- Student info section on output page

## Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS, Zustand
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- Queue: BullMQ with Redis
- AI: Groq API (Llama 3.1)
- Real-time: WebSocket

## Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Installation

1. Clone the repo.
2. Start MongoDB and Redis:
   ```bash
   docker-compose up -d
   ```
3. Install dependencies for backend and frontend:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

### Environment
The backend uses `dotenv` and loads configuration from `backend/.env`.

Create a backend `.env` file with values like:
```env
PORT=5002
MONGODB_URI=your-mongodb-connection-string
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=your-groq-api-key
```

A sample file is also available at `backend/.env.example`.

### Ports and routing
- Backend: `http://localhost:5002`
- Frontend: `http://localhost:3000`

The frontend proxy is configured in `frontend/next.config.js` to forward `/api/*` to the backend at port `5002`.
The WebSocket client connects to `ws://localhost:5002` in `frontend/hooks/UseWebSocket.ts`.

If your backend port is different, update all of:
- `backend/.env` (`PORT`)
- `frontend/next.config.js` rewrite destination
- `frontend/hooks/UseWebSocket.ts` WebSocket URL

### Run
Open two terminals:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

### Troubleshooting
- If the frontend cannot reach the API, make sure backend is running on port `5002` and `backend/.env` is loaded.
- If WebSocket updates do not appear, ensure `REDIS_URL` is correct and Redis is running.
- If `PORT` is missing from `.env`, backend falls back to `5000`, but the frontend expects `5002` by default.
