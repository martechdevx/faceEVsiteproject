from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # ── MySQL
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

    # ── JWT 
    SECRET_KEY: str = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Storage 
    UPLOAD_DIR: str = "storage/images"
    FAISS_DIR: str = "storage/faiss"

    # HMAC SECRET 
    HMAC_SECRET: str = "replace_with_a_long_random_hmac_secret_key"
    # Comma-separated emails allowed to use admin-management endpoints.
    ADMIN_EMAILS: str = ""

    @property
    def admin_emails(self) -> set[str]:
        return {
            email.strip().lower()
            for email in self.ADMIN_EMAILS.split(",")
            if email.strip()
        }


settings = Settings()
