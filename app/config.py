from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "VidGrabber"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_DOMAINS: list = [
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "dailymotion.com"
    ]
    
    class Config:
        env_file = ".env"

settings = Settings()