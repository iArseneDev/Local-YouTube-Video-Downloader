"""FastAPI application and static frontend for VidGrabber."""

import logging
import os
import asyncio
import re
import shutil
import threading
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel, HttpUrl
from starlette.staticfiles import StaticFiles

from app.core.downloader import downloader

ROOT = Path(__file__).resolve().parent
logger = logging.getLogger("vidgrabber")
downloads = {}
downloads_lock = threading.Lock()

app = FastAPI(title="YouTube Video Downloader API", version="2.0.0")

origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class DownloadRequest(BaseModel):
    url: HttpUrl
    format: Optional[str] = None


@app.get("/", include_in_schema=False)
async def frontend():
    return FileResponse(ROOT / "index.html")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/info")
async def get_video_info(url: str = Query(..., description="URL of a supported video")):
    result = await asyncio.to_thread(downloader.get_video_info, url)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/formats")
async def list_formats(url: str = Query(..., description="URL of a supported video")):
    result = await asyncio.to_thread(downloader.get_video_info, url)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"formats": result["formats"]}


async def _run_download(job_id: str, url: str, format_id: Optional[str]):
    def progress_hook(data):
        with downloads_lock:
            job = downloads.get(job_id)
            if not job:
                return
            if data.get("status") == "downloading":
                total = data.get("total_bytes") or data.get("total_bytes_estimate")
                job.update({
                    "status": "downloading",
                    "percent": round(data.get("downloaded_bytes", 0) * 100 / total, 1) if total else None,
                    "downloaded_bytes": data.get("downloaded_bytes", 0),
                    "total_bytes": total,
                    "speed": data.get("speed"),
                    "eta": data.get("eta"),
                })
            elif data.get("status") == "finished":
                job.update({"status": "merging", "percent": 100, "phase": "Merging audio and video"})

    result = await asyncio.to_thread(downloader.download_video, url, format_id, progress_hook)
    with downloads_lock:
        job = downloads.get(job_id)
        if not job:
            return
        if result["success"]:
            file_path = Path(result["path"])
            job.update({"status": "complete", "percent": 100, "path": str(file_path), "title": result.get("title")})
        else:
            job.update({"status": "error", "error": result.get("error", "Download failed")})


def _cleanup_job(job_id: str, folder: Path):
    shutil.rmtree(folder, ignore_errors=True)
    with downloads_lock:
        downloads.pop(job_id, None)


@app.post("/api/download", status_code=202)
async def start_download(request: DownloadRequest):
    job_id = uuid.uuid4().hex
    with downloads_lock:
        downloads[job_id] = {"status": "starting", "percent": 0}
    asyncio.create_task(_run_download(job_id, str(request.url), request.format))
    return {"job_id": job_id, "status": "starting"}


@app.get("/api/download/{job_id}")
async def download_status(job_id: str):
    with downloads_lock:
        job = downloads.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Download job not found")
        return {key: value for key, value in job.items() if key != "path"}


@app.get("/api/download/{job_id}/file")
async def download_file(job_id: str):
    with downloads_lock:
        job = downloads.get(job_id)
        if not job or job.get("status") != "complete":
            raise HTTPException(status_code=409, detail="Download is not ready yet")
        file_path = Path(job["path"])
        title = job.get("title") or "video"
    safe_title = re.sub(r"[^\w .()-]", "_", title).strip(" .")[:150] or "video"
    return FileResponse(file_path, media_type="video/mp4", filename=f"{safe_title}.mp4", background=BackgroundTask(_cleanup_job, job_id, file_path.parent))


app.mount("/src", StaticFiles(directory=ROOT / "src"), name="src")
app.mount("/images", StaticFiles(directory=ROOT / "images"), name="images")
for asset in ("favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "site.webmanifest"):
    app.add_api_route(
        f"/{asset}",
        lambda asset=asset: FileResponse(ROOT / asset),
        methods=["GET"],
        include_in_schema=False,
    )
