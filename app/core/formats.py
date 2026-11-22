from typing import List, Dict, Optional

def get_best_format(formats: List[Dict]) -> Optional[str]:
    """Select the best format from available formats"""
    if not formats:
        return None
    
    # Filter for formats with both video and audio
    combined_formats = [
        fmt for fmt in formats 
        if fmt.get('has_video') and fmt.get('has_audio')
    ]
    
    if combined_formats:
        # Sort by resolution/quality
        sorted_formats = sorted(
            combined_formats,
            key=lambda x: _get_quality_score(x),
            reverse=True
        )
        return sorted_formats[0].get('url')
    
    # Fallback to any format with a URL
    for fmt in formats:
        if fmt.get('url'):
            return fmt.get('url')
    
    return None

def _get_quality_score(fmt: Dict) -> int:
    """Calculate quality score for format sorting"""
    score = 0
    
    # Resolution scoring
    resolution = str(fmt.get('resolution', '0')).lower()
    if '4320' in resolution or '8k' in resolution:
        score += 4000
    elif '2160' in resolution or '4k' in resolution:
        score += 3000
    elif '1440' in resolution or '2k' in resolution:
        score += 2500
    elif '1080' in resolution:
        score += 2000
    elif '720' in resolution:
        score += 1500
    elif '480' in resolution:
        score += 1000
    elif '360' in resolution:
        score += 500
    
    # Format preference
    ext = str(fmt.get('ext', '')).lower()
    if ext == 'mp4':
        score += 200
    elif ext == 'webm':
        score += 100
    elif ext == 'mkv':
        score += 50
    
    # Codec preference
    vcodec = str(fmt.get('vcodec', '')).lower()
    if 'av01' in vcodec:
        score += 150
    elif 'vp9' in vcodec:
        score += 100
    elif 'h.265' in vcodec or 'hevc' in vcodec:
        score += 80
    elif 'h.264' in vcodec or 'avc' in vcodec:
        score += 50
    
    return score
