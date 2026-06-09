from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    database_url: str = "postgresql+asyncpg://quizapp:password@localhost:5432/quizdb"
    rabbitmq_url: str = "amqp://quizapp:password@localhost:5672/"
    openrouter_key: str = ""
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 20
    environment: str = "development"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> WorkerSettings:
    return WorkerSettings()
