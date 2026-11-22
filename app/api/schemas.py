from pydantic import BaseModel, HttpUrl
from typing import Optional, List

class VideoInfoResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    uploader: Optional[str] = None
    webpage_url: Optional[str] = None
    formats: List[dict] = []
    error: Optional[str] = None

class DownloadRequest(BaseModel):
    url: HttpUrl
    format: Optional[str] = None

class DownloadResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str