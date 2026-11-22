// api.js - API communication functions
const API = {
    // API configuration
    config: {
        baseUrl: 'https://vidgrabber-downloader.up.railway.app',
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000,
        cacheDuration: 5 * 60 * 1000, // 5 minutes
    },

    // Cache storage
    cache: new Map(),

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null
     */
    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.config.cacheDuration) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    },

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    /**
     * Make API request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, options = {}, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        try {
            const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }
            
            return await response.json();
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Retry logic for network errors
            if (attempt < this.config.retryAttempts && 
                (error.name === 'AbortError' || error.name === 'TypeError')) {
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
                return this.request(endpoint, options, attempt + 1);
            }
            
            throw error;
        }
    },

    /**
     * Get video information
     * @param {string} url - Video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfo(url) {
        const cacheKey = `info_${btoa(url)}`;
        const cached = this.getCache(cacheKey);
        if (cached) return cached;
        
        try {
            const data = await this.request(`/api/info?url=${encodeURIComponent(url)}`);
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get video info:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch video information'
            };
        }
    },

    /**
     * Get download link for specific format
     * @param {string} url - Video URL
     * @param {string} format - Format ID
     * @returns {Promise<Object>} Download information
     */
    async getDownloadLink(url, format) {
        const cacheKey = `download_${btoa(url)}_${format}`;
        const cached = this.getCache(cacheKey);
        if (cached) return cached;
        
        try {
            const data = await this.request('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format })
            });
            
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get download link:', error);
            return {
                success: false,
                error: error.message || 'Failed to get download link'
            };
        }
    },

    /**
     * Get download link via form (for manifest URLs)
     * @param {string} url - Video URL
     * @param {string} format - Format ID
     * @returns {Promise<Object>} Download information
     */
    async getDownloadLinkForm(url, format) {
        try {
            const formData = new FormData();
            formData.append('url', url);
            formData.append('format', format);
            
            const data = await this.request('/api/download-form', {
                method: 'POST',
                body: formData
            });
            
            return data;
        } catch (error) {
            console.error('Failed to get form download link:', error);
            return {
                success: false,
                error: error.message || 'Failed to get download link'
            };
        }
    },

    /**
     * Check API health
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    },

    /**
     * Get available formats
     * @param {string} url - Video URL
     * @returns {Promise<Object>} Formats list
     */
    async getFormats(url) {
        try {
            return await this.request(`/api/formats?url=${encodeURIComponent(url)}`);
        } catch (error) {
            console.error('Failed to get formats:', error);
            return {
                formats: [],
                error: error.message
            };
        }
    },

    /**
     * Clear API cache
     */
    clearCache() {
        this.cache.clear();
    },

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    },

    /**
     * Direct download helper - opens URL in new tab
     * @param {string} downloadUrl - Direct download URL
     * @param {string} filename - Suggested filename
     */
    directDownload(downloadUrl, filename = 'video.mp4') {
        // Create temporary link for download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Proxy download for CORS-restricted URLs
     * @param {string} url - Video URL
     * @param {string} format - Format ID
     */
    proxyDownload(url, format) {
        // Create form for proxy endpoint
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${this.config.baseUrl}/api/download-form`;
        form.target = '_blank';
        
        const urlInput = document.createElement('input');
        urlInput.type = 'hidden';
        urlInput.name = 'url';
        urlInput.value = url;
        
        const formatInput = document.createElement('input');
        formatInput.type = 'hidden';
        formatInput.name = 'format';
        formatInput.value = format;
        
        form.appendChild(urlInput);
        form.appendChild(formatInput);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    },

    /**
     * Smart download handler - chooses best method based on URL
     * @param {string} url - Video URL
     * @param {string} format - Format ID
     * @returns {Promise<Object>} Download result
     */
    async smartDownload(url, format) {
        try {
            // First get download link
            const result = await this.getDownloadLink(url, format);
            
            if (!result.success) {
                return result;
            }
            
            const downloadUrl = result.download_url;
            
            // Check URL type and choose download method
            if (downloadUrl.includes('googlevideo.com/videoplayback')) {
                // Direct Google video URL - open in new tab
                window.open(downloadUrl, '_blank');
                return {
                    ...result,
                    method: 'direct',
                    message: 'Opening download in new tab...'
                };
                
            } else if (downloadUrl.includes('manifest.googlevideo.com')) {
                // Manifest URL - use proxy
                this.proxyDownload(url, format);
                return {
                    ...result,
                    method: 'proxy',
                    message: 'Downloading via proxy...'
                };
                
            } else {
                // Other direct URL
                window.open(downloadUrl, '_blank');
                return {
                    ...result,
                    method: 'direct',
                    message: 'Starting download...'
                };
            }
            
        } catch (error) {
            console.error('Smart download failed:', error);
            return {
                success: false,
                error: error.message || 'Download failed'
            };
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
} else {
    window.API = API;

}









