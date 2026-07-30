import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./snapbooth.db"
    UPLOAD_DIR: str = "./uploads"
    MAX_IMAGE_SIZE: int = 2048
    JPEG_QUALITY: int = 95
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    SITE_URL: str = "http://localhost:5173"

    @property
    def origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
