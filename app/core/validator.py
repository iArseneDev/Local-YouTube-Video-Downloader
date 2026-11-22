"""Strict validation for supported public video URLs."""

from urllib.parse import urlsplit

SUPPORTED_HOSTS = {
    "youtube.com", "youtu.be", "youtube-nocookie.com",
    "vimeo.com", "dailymotion.com", "dai.ly",
    "facebook.com", "fb.watch", "twitter.com", "x.com",
    "tiktok.com", "instagram.com",
}


def validate_url(url: str) -> bool:
    if not url or len(url) > 4096:
        raise ValueError("Enter a valid URL from a supported video site.")
    try:
        parsed = urlsplit(url.strip())
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Enter a valid URL from a supported video site.") from exc

    supported = any(host == domain or host.endswith("." + domain) for domain in SUPPORTED_HOSTS)
    if parsed.scheme not in {"http", "https"} or not supported or parsed.username or parsed.password:
        raise ValueError("This video site is not supported.")
    if port not in (None, 80, 443):
        raise ValueError("Custom URL ports are not supported.")
    return True
