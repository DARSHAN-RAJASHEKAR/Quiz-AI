from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.routers import attempts, auth, jobs, quizzes

limiter = Limiter(key_func=get_remote_address)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown (close DB engine pools, etc.)


app = FastAPI(
    title="AI Quiz Generator API",
    description="Generate AI-powered quizzes from PDFs, text, or topic descriptions.",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(quizzes.router, prefix=API_PREFIX)
app.include_router(jobs.router, prefix=API_PREFIX)
app.include_router(attempts.router, prefix=API_PREFIX)


# ── Health checks ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def ready():
    """Check DB connectivity."""
    from sqlalchemy import text
    from app.database import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database not ready: {e}")
