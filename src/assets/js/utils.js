// utils.js - Utility functions

const Utils = {
    /**
     * Format duration in seconds to HH:MM:SS or MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Format file size in bytes to human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    isValidUrl(url) {
        if (!url) return false;
        
        // Simple regex for common video URLs
        const urlPatterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+/,
            /^(https?:\/\/)?(www\.)?(dailymotion\.com|dai\.ly)\/.+/,
            /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+/,
            /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+/,
            /^(https?:\/\/)?(www\.)?(instagram\.com)\/.+/,
            /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.+/
        ];
        
        // Check if matches any pattern
        return urlPatterns.some(pattern => pattern.test(url.trim()));
    },

    /**
     * Sanitize filename by removing invalid characters
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFilename(filename) {
        if (!filename) return 'video';
        return filename
            .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid characters
            .replace(/\s+/g, '_')          // Replace spaces with underscores
            .substring(0, 100);            // Limit length
    },

    /**
     * Get file extension from URL
     * @param {string} url - File URL
     * @returns {string} File extension
     */
    getFileExtension(url) {
        if (!url) return 'mp4';
        
        const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
        if (match && match[1]) {
            return match[1].toLowerCase();
        }
        
        // Default based on URL patterns
        if (url.includes('mime=video%2Fmp4')) return 'mp4';
        if (url.includes('mime=video%2Fwebm')) return 'webm';
        
        return 'mp4';
    },

    /**
     * Get video platform from URL
     * @param {string} url - Video URL
     * @returns {string} Platform name
     */
    getVideoPlatform(url) {
        if (!url) return 'Unknown';
        
        const platforms = {
            'youtube.com': 'YouTube',
            'youtu.be': 'YouTube',
            'vimeo.com': 'Vimeo',
            'dailymotion.com': 'Dailymotion',
            'dai.ly': 'Dailymotion',
            'facebook.com': 'Facebook',
            'fb.watch': 'Facebook',
            'twitter.com': 'Twitter',
            'x.com': 'Twitter',
            'instagram.com': 'Instagram',
            'tiktok.com': 'TikTok'
        };
        
        for (const [domain, name] of Object.entries(platforms)) {
            if (url.includes(domain)) {
                return name;
            }
        }
        
        return 'Other';
    },

    /**
     * Debounce function for limiting API calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err2) {
                console.error('Failed to copy:', err2);
                return false;
            }
        }
    },

    /**
     * Get quality score for sorting formats
     * @param {Object} format - Format object
     * @returns {number} Quality score
     */
    getQualityScore(format) {
        let score = 0;
        
        // Resolution scoring
        const resolution = format.resolution || '';
        if (resolution.includes('4320') || resolution.includes('8k')) score += 4000;
        else if (resolution.includes('2160') || resolution.includes('4k')) score += 3000;
        else if (resolution.includes('1440') || resolution.includes('2k')) score += 2500;
        else if (resolution.includes('1080')) score += 2000;
        else if (resolution.includes('720')) score += 1500;
        else if (resolution.includes('480')) score += 1000;
        else if (resolution.includes('360')) score += 500;
        
        // Combined format (video+audio)
        if (format.has_video && format.has_audio) score += 1000;
        
        // MP4 preferred
        if (format.ext === 'mp4') score += 500;
        
        return score;
    },

    /**
     * Parse URL parameters
     * @param {string} url - URL to parse
     * @returns {Object} URL parameters
     */
    parseUrlParams(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            
            return params;
        } catch {
            return {};
        }
    },

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Throttle function for limiting function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Format date to relative time
     * @param {string|Date} date - Date to format
     * @returns {string} Relative time string
     */
    formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        return past.toLocaleDateString();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}