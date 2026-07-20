# CVConnect

CVConnect is a resume optimisation workspace: upload a PDF/DOCX resume, analyse a job description, inspect the match score and skill gaps, then review AI-proposed edits before exporting.

## Quick start

1. Copy `.env.example` to `.env` and set the two JWT secrets. Add an OpenAI API key to enable AI rewriting (the app has a safe local fallback for development).
2. Start the stack: `docker compose up --build`.
3. In a second terminal run `docker compose exec backend npx prisma migrate deploy`.
4. Visit `http://localhost:5173`; the API health check is at `http://localhost:5000/health`.

For local development, run `npm install` in `backend` and `frontend`, then `npm run dev` in both folders. In `ml-service`, create a virtual environment and run `pip install -r requirements.txt && python app.py`.

## Architecture

- `frontend/` — React, Redux Toolkit, Tailwind, Recharts, and accessible editor controls.
- `backend/` — Express API, Prisma/Postgres persistence, Redis caching, JWT auth, Socket.IO progress events and S3-ready upload abstraction.
- `ml-service/` — FastAPI service for skill extraction and embedding similarity; it degrades to a lightweight lexical model when large ML models are unavailable.

## API

All API routes below require `Authorization: Bearer <access token>` except `POST /api/auth/register`, `POST /api/auth/login`, and `GET /health`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/resumes/upload` | Upload a PDF/DOCX (10 MB maximum) and parse it |
| POST | `/api/jobs/analyze` | Extract job skills and requirements |
| POST | `/api/resumes/:id/match` | Calculate weighted matching score |
| POST | `/api/resumes/:id/rewrite` | Generate tracked, honest optimisation proposals |
| GET | `/api/resumes` | Paginated resume history |
| GET/PUT | `/api/users/me` | Read/update profile |

## Production notes

Use managed Postgres, Redis, object storage, a secret manager and an HTTPS reverse proxy in production. Set a restrictive `CLIENT_ORIGIN`, rotate JWT secrets, apply migrations in CI/CD before rollout, and configure Sentry/Prometheus endpoints through your platform. Setting the `AWS_S3_*` variables stores source documents with server-side encryption; leaving them empty keeps local development storage-free. The included GitHub Actions workflow validates backend and frontend on each push.
