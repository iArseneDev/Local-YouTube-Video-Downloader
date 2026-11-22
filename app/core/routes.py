from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse  # ← ADD THIS
from pydantic import BaseModel, HttpUrl
from typing import Optional
from app.core.downloader import downloader

app = FastAPI(title="VidGrabber API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class DownloadRequest(BaseModel):
    url: HttpUrl
    format: Optional[str] = None

class VideoInfoResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    formats: list = []
    error: Optional[str] = None

class DownloadResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None

# Routes
@app.get("/")
async def root():
    return {"message": "VidGrabber API", "version": "1.0.0"}

@app.get("/api/info", response_model=VideoInfoResponse)
async def get_video_info(url: str = Query(..., description="Video URL")):
    """Get video information and available formats"""
    return downloader.get_video_info(url)

@app.post("/api/download")
async def get_download_link(request: DownloadRequest):
    """Redirect to direct download link"""
    result = downloader.get_download_link(
        str(request.url),
        request.format
    )
    
    if result['success'] and result['download_url']:
        # ✅ Redirect to Google Drive download URL
        return RedirectResponse(url=result['download_url'], status_code=302)
    else:
        raise HTTPException(
            status_code=400, 
            detail=result.get('error', 'Failed to get download link')
        )

@app.get("/api/formats")
async def list_formats(url: str = Query(...)):
    """List available formats for a video"""
    info = downloader.get_video_info(url)
    if not info['success']:
        raise HTTPException(status_code=400, detail=info['error'])
    return {"formats": info['formats']}