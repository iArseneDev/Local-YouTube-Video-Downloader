"""Video metadata and direct-link extraction via yt-dlp."""

import logging
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import yt_dlp

from app.core.validator import validate_url

logger = logging.getLogger(__name__)


class VideoDownloader:
    def __init__(self) -> None:
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "socket_timeout": 20,
            "retries": 2,
            "fragment_retries": 2,
            "extract_flat": False,
            "force_generic_extractor": False,
        }

    def get_video_info(self, url: str) -> Dict[str, Any]:
        try:
            validate_url(url)
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
            if not info:
                return {"success": False, "error": "Could not extract video information."}

            formats = []
            video_heights = set()
            for fmt in info.get("formats") or []:
                media_url = fmt.get("url") or fmt.get("manifest_url")
                has_video = fmt.get("vcodec") not in (None, "none")
                has_audio = fmt.get("acodec") not in (None, "none")
                if not media_url or not has_video:
                    continue
                if fmt.get("height"):
                    video_heights.add(int(fmt["height"]))
                if not has_audio:
                    continue
                formats.append(
                    {
                        "format_id": str(fmt.get("format_id", "")),
                        "ext": fmt.get("ext") or "unknown",
                        "resolution": self._get_resolution(fmt),
                        "filesize": self._format_filesize(fmt.get("filesize") or fmt.get("filesize_approx")),
                        "format_note": fmt.get("format_note") or "",
                        "vcodec": fmt.get("vcodec"),
                        "acodec": fmt.get("acodec"),
                        "has_video": True,
                        "has_audio": True,
                    }
                )

            for height in sorted(video_heights, reverse=True):
                formats.append({
                    "format_id": f"merge_{height}",
                    "ext": "mp4",
                    "resolution": f"{height}p",
                    "filesize": "Size varies",
                    "format_note": "Video + audio (merged locally)",
                    "vcodec": "best available",
                    "acodec": "best available",
                    "has_video": True,
                    "has_audio": True,
                })

            formats.sort(key=self._get_quality_score, reverse=True)
            return {
                "success": True,
                "title": info.get("title") or "Untitled video",
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "formats": formats,
                "uploader": info.get("uploader"),
                "webpage_url": info.get("webpage_url"),
            }
        except ValueError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.warning("Video metadata extraction failed: %s", exc)
            return {"success": False, "error": "Could not read this video. It may be private, unavailable, or unsupported."}

    def get_download_link(self, url: str, format_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            validate_url(url)
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
            if not info:
                return {"success": False, "error": "Could not extract video information."}

            candidates = [
                fmt for fmt in info.get("formats") or []
                if (fmt.get("url") or fmt.get("manifest_url"))
                and fmt.get("vcodec") not in (None, "none")
                and fmt.get("acodec") not in (None, "none")
            ]
            selected = next(
                (fmt for fmt in candidates if str(fmt.get("format_id")) == str(format_id)),
                None,
            ) if format_id else max(candidates, key=self._raw_quality_score, default=None)
            if not selected:
                return {"success": False, "error": "That downloadable format is no longer available. Analyze the video again."}

            download_url = selected.get("url") or selected.get("manifest_url")
            return {
                "success": True,
                "download_url": download_url,
                "title": info.get("title") or "video",
                "format": str(selected.get("format_id", "")),
                "resolution": self._get_resolution(selected),
                "filesize": self._format_filesize(selected.get("filesize") or selected.get("filesize_approx")),
                "headers": selected.get("http_headers") or {},
            }
        except ValueError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.warning("Download link extraction failed: %s", exc)
            return {"success": False, "error": "Could not prepare this download. Please analyze the video again."}

    def download_video(self, url: str, format_id: Optional[str] = None, progress_hook=None) -> Dict[str, Any]:
        """Download a selected format, merging separate audio/video streams locally."""
        try:
            validate_url(url)
            if format_id and str(format_id).startswith("merge_"):
                height = int(str(format_id).split("_", 1)[1])
                selector = f"bestvideo[height<={height}]+bestaudio/best[height<={height}]"
            else:
                selector = str(format_id) if format_id else "bestvideo+bestaudio/best"

            folder = Path(tempfile.gettempdir()) / "vidgrabber-downloads" / uuid.uuid4().hex
            folder.mkdir(parents=True, exist_ok=True)
            opts = {
                **self.ydl_opts,
                "format": selector,
                "outtmpl": str(folder / "%(title).180B-%(id)s.%(ext)s"),
                "merge_output_format": "mp4",
            }
            if progress_hook:
                opts["progress_hooks"] = [progress_hook]
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            files = [path for path in folder.iterdir() if path.is_file()]
            if not files:
                return {"success": False, "error": "The download finished without producing a media file."}
            output = max(files, key=lambda path: path.stat().st_size)
            return {"success": True, "path": str(output), "title": info.get("title") or "video"}
        except ValueError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.warning("Video download failed: %s", exc)
            return {"success": False, "error": "Download failed. Check that FFmpeg is installed and the video is available."}

    @staticmethod
    def _get_resolution(fmt: Dict[str, Any]) -> str:
        if fmt.get("resolution") and fmt["resolution"] != "audio only":
            return str(fmt["resolution"])
        if fmt.get("height"):
            return f"{fmt['height']}p"
        if fmt.get("width") and fmt.get("height"):
            return f"{fmt['width']}x{fmt['height']}"
        return "N/A"

    @staticmethod
    def _format_filesize(size_bytes: Optional[int]) -> str:
        if size_bytes is None:
            return "Unknown size"
        size = float(size_bytes)
        for unit in ("B", "KB", "MB", "GB"):
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} TB"

    @classmethod
    def _raw_quality_score(cls, fmt: Dict[str, Any]) -> int:
        return cls._get_quality_score(
            {
                "resolution": cls._get_resolution(fmt),
                "ext": fmt.get("ext"),
                "filesize": cls._format_filesize(fmt.get("filesize") or 0),
            }
        )

    @staticmethod
    def _get_quality_score(fmt: Dict[str, Any]) -> int:
        score = 0
        resolution = str(fmt.get("resolution", "")).lower()
        for marker, points in (("4320", 4000), ("2160", 3000), ("1440", 2500), ("1080", 2000), ("720", 1500), ("480", 1000), ("360", 500)):
            if marker in resolution:
                score += points
                break
        if fmt.get("ext") == "mp4":
            score += 500
        size = str(fmt.get("filesize", ""))
        if " MB" in size:
            try:
                score += int(float(size.replace(" MB", "")))
            except ValueError:
                pass
        return score


downloader = VideoDownloader()
