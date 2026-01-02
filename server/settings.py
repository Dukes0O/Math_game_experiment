from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    db_url: str = f"sqlite:///{Path(__file__).resolve().parent / 'data.db'}"
    secret_key: str = "local-secret-key"
    static_dir: Path = Path(__file__).resolve().parent.parent / 'client'

settings = Settings()
