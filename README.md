# YouTube Video Downloader

A small, locally run video downloader. The browser interface, FastAPI service, `yt-dlp`, and FFmpeg run on your computer. Video pages and media are fetched from the source platform; no VidGrabber cloud service is used.

## Requirements

- Python 3.10 or newer
- FFmpeg available on `PATH` (needed to merge separate video and audio streams)
- An internet connection to reach the video source

On Fedora, install FFmpeg with `sudo dnf install ffmpeg`. On Debian or Ubuntu, use `sudo apt install ffmpeg`.

## Start the app

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
python -m pip install -r requirements.txt
python run.py
```

Open <http://localhost:8000>. The single local server serves both the page and API. Keep the terminal open while analyzing or downloading. Stop the server with Ctrl+C.

## Download flow

1. Paste a video URL and choose a listed quality.
2. The local server downloads the selected streams and merges audio/video with FFmpeg.
3. The page displays download progress and saves the finished MP4 through the browser.

Temporary files are created under the operating system's temporary directory and removed after the browser retrieves the completed file.

## API

- `GET /health` reports whether the local server is running.
- `GET /api/info?url=<video URL>` reads metadata and available qualities.
- `POST /api/download` starts a job with JSON `{"url":"https://…","format":"merge_720"}` and returns a job ID.
- `GET /api/download/{job_id}` reports progress.
- `GET /api/download/{job_id}/file` returns the completed MP4.

Only download videos you have permission to save. Site availability and format options can change, and private, DRM-protected, or otherwise restricted videos are not supported.
