from fastapi import FastAPI, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse  # Make sure JSONResponse is imported
from pydantic import BaseModel, HttpUrl
from typing import Optional
from app.core.downloader import downloader
import uvicorn

app = FastAPI(title="VidGrabber API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⭐⭐⭐ ADD THIS - FIXES PREFLIGHT REQUESTS ⭐⭐⭐
@app.middleware("http")
async def handle_options_requests(request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(
            content={"message": "Preflight OK"},
            status_code=200
        )
    else:
        response = await call_next(request)
    
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://y2matez.pages.dev"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Request Models
class DownloadRequest(BaseModel):
    url: HttpUrl
    format: Optional[str] = None

# Routes
@app.get("/")
async def root():
    return {"message": "VidGrabber API", "status": "running"}

@app.post("/api/download")
async def get_download_link(request: DownloadRequest):
    """Get download link as JSON"""
    try:
        result = downloader.get_download_link(str(request.url), request.format)
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/info")
async def get_video_info(url: str = Query(..., description="Video URL")):
    """Get video information and available formats"""
    return downloader.get_video_info(url)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)



