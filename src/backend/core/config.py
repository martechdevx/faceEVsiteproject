from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── MySQL ──────────────────────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "yourpassword"
    DB_NAME: str = "faceev_db"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    # ── JWT ───────────────────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Storage ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "storage/images"
    FAISS_DIR: str = "storage/faiss"

    class Config:
        env_file = ".env"


settings = Settings()
