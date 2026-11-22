const API = {
    baseUrl: (document.querySelector('meta[name="api-base"]')?.content || '').replace(/\/$/, ''),

    async request(path, options = {}) {
        const controller = new AbortController();
        // Some extractors take over a minute on slow connections. Keep a generous
        // ceiling, while socket_timeout in yt-dlp bounds individual network calls.
        const timeout = setTimeout(() => controller.abort(), 150000);
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                ...options,
                signal: controller.signal,
                headers: { Accept: 'application/json', ...(options.headers || {}) }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.detail || body.error || `Request failed (${response.status})`);
            }
            return body;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('The request took too long. Check your connection and try again.');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    },

    checkHealth() {
        return this.request('/health');
    },

    getVideoInfo(url) {
        return this.request(`/api/info?url=${encodeURIComponent(url)}`);
    },

    startDownload(url, format) {
        return this.request('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format })
        });
    },

    getDownloadStatus(jobId) {
        return this.request(`/api/download/${encodeURIComponent(jobId)}`);
    },

    async downloadFile(jobId) {
        const response = await fetch(`${this.baseUrl}/api/download/${encodeURIComponent(jobId)}/file`, {
            method: 'GET',
            signal: AbortSignal.timeout(600000)
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || `Download failed (${response.status})`);
        }
        return response.blob();
    }
};

window.API = API;
