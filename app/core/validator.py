import re
from urllib.parse import urlparse
from typing import List

class URLValidator:
    def __init__(self):
        self.allowed_domains = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com',
            'facebook.com',
            'twitter.com',
            'tiktok.com',
            'instagram.com'
        ]
        
    def validate(self, url: str) -> tuple:
        """Validate URL and return (is_valid, error_message)"""
        if not url:
            return False, "URL is empty"
        
        # Check if it's a valid URL
        try:
            result = urlparse(url)
            if not all([result.scheme, result.netloc]):
                return False, "Invalid URL format"
        except:
            return False, "Invalid URL format"
        
        # Check if domain is allowed
        domain = result.netloc.lower()
        domain = domain.replace('www.', '')
        
        if not any(allowed in domain for allowed in self.allowed_domains):
            return False, f"Domain not supported. Supported: {', '.join(self.allowed_domains)}"
        
        return True, ""

def validate_url(url: str) -> bool:
    """Simple URL validation function"""
    validator = URLValidator()
    is_valid, error = validator.validate(url)
    if not is_valid:
        raise ValueError(error)
    return True