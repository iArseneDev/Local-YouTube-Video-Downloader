import hashlib
import time
from typing import Any, Dict

def generate_id(data: str) -> str:
    """Generate unique ID from string"""
    return hashlib.md5(data.encode()).hexdigest()[:8]

def format_duration(seconds: int) -> str:
    """Format seconds to HH:MM:SS or MM:SS"""
    if not seconds:
        return "00:00"
    
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def format_file_size(bytes: int) -> str:
    """Format bytes to human readable size"""
    if not bytes:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB']
    i = 0
    while bytes >= 1024 and i < len(units) - 1:
        bytes /= 1024
        i += 1
    
    return f"{bytes:.2f} {units[i]}"

def safe_get(data: Dict, keys: List[str], default: Any = None) -> Any:
    """Safely get nested dictionary values"""
    for key in keys:
        try:
            data = data[key]
        except (KeyError, TypeError, IndexError):
            return default
    return data