import yt_dlp
import logging
from typing import Dict, Any, Optional
import time

logger = logging.getLogger(__name__)

class VideoDownloader:
    def __init__(self):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'force_generic_extractor': False,
        }
    
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video information without downloading"""
        try:
            # Validate URL
            if not url or 'http' not in url:
                return {'success': False, 'error': 'Invalid URL'}
            
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    return {'success': False, 'error': 'Could not extract video info'}
                
                # Get available formats - ONLY THOSE WITH FILE SIZES
                formats = []
                if 'formats' in info:
                    for fmt in info.get('formats', []):
                        # Check if format has BOTH URL AND FILE SIZE
                        has_url = fmt.get('url') or fmt.get('manifest_url')
                        has_filesize = fmt.get('filesize') or fmt.get('filesize_approx')
                        
                        # ONLY include formats with both URL and file size
                        if has_url and has_filesize:
                            format_data = {
                                'format_id': fmt.get('format_id', ''),
                                'ext': fmt.get('ext', 'mp4'),
                                'resolution': self._get_resolution(fmt),
                                'filesize': self._format_filesize(fmt.get('filesize') or fmt.get('filesize_approx')),
                                'format_note': fmt.get('format_note', ''),
                                'vcodec': fmt.get('vcodec'),
                                'acodec': fmt.get('acodec'),
                                'has_video': fmt.get('vcodec') not in [None, 'none'],
                                'has_audio': fmt.get('acodec') not in [None, 'none'],
                                'url': fmt.get('url'),
                            }
                            
                            if 'http_headers' in fmt:
                                format_data['http_headers'] = fmt['http_headers']
                            
                            formats.append(format_data)
                
                # Sort by quality
                formats = sorted(formats, key=lambda x: self._get_quality_score(x), reverse=True)
                
                return {
                    'success': True,
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration'),
                    'thumbnail': info.get('thumbnail'),
                    'formats': formats,
                    'uploader': info.get('uploader'),
                    'webpage_url': info.get('webpage_url'),
                }
                
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_download_link(self, url: str, format_id: Optional[str] = None) -> Dict:
        """Get direct download link for specific format"""
        try:
            # Get fresh info
            info = self.get_video_info(url)
            if not info['success']:
                return info
            
            # Find the requested format
            download_url = None
            format_data = None
            
            if format_id:
                # Find specific format
                for fmt in info['formats']:
                    if fmt.get('format_id') == format_id:
                        download_url = fmt.get('url')
                        format_data = fmt
                        break
            else:
                # Get best format
                if info['formats']:
                    format_data = info['formats'][0]
                    download_url = format_data.get('url')
            
            if not download_url:
                return {'success': False, 'error': 'Format not available'}
            
            return {
                'success': True,
                'download_url': download_url,
                'title': info['title'],
                'format': format_data.get('format_id') if format_data else format_id,
                'resolution': format_data.get('resolution') if format_data else '',
                'filesize': format_data.get('filesize') if format_data else '',
                'is_direct': 'googlevideo.com/videoplayback' in download_url,
                'headers': format_data.get('http_headers', {}) if format_data else {}
            }
            
        except Exception as e:
            logger.error(f"Error getting download link: {e}")
            return {'success': False, 'error': str(e)}
    
    def _get_resolution(self, fmt: Dict) -> str:
        """Get resolution string"""
        if fmt.get('resolution'):
            return fmt['resolution']
        if fmt.get('height'):
            return f"{fmt['height']}p"
        if fmt.get('width') and fmt.get('height'):
            return f"{fmt['width']}x{fmt['height']}"
        return 'N/A'
    
    def _format_filesize(self, size_bytes: Optional[int]) -> str:
        """Format filesize"""
        if not size_bytes:
            return 'Unknown'
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"
    
    def _get_quality_score(self, fmt: Dict) -> int:
        """Calculate quality score for sorting"""
        score = 0
        
        # Resolution
        res = str(fmt.get('resolution', '')).lower()
        if '4320' in res or '8k' in res:
            score += 4000
        elif '2160' in res or '4k' in res:
            score += 3000
        elif '1440' in res or '2k' in res:
            score += 2500
        elif '1080' in res:
            score += 2000
        elif '720' in res:
            score += 1500
        elif '480' in res:
            score += 1000
        elif '360' in res:
            score += 500
        
        # Combined format (video+audio)
        if fmt.get('has_video') and fmt.get('has_audio'):
            score += 1000
        
        # MP4 preferred
        if fmt.get('ext') == 'mp4':
            score += 500
        
        # Filesize (larger usually means better)
        filesize = str(fmt.get('filesize', ''))
        if 'MB' in filesize:
            try:
                mb = float(filesize.replace(' MB', ''))
                score += int(mb)
            except:
                pass
        
        return score

# Global instance
downloader = VideoDownloader()
