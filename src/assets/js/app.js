// app.js - Main application controller

const App = {
    // Application state
    state: {
        currentVideoUrl: '',
        currentVideoInfo: null,
        currentFormat: null,
        isProcessing: false,
        downloadHistory: [],
        apiHealth: 'unknown'
    },

    // Configuration
    config: {
        apiUrl: '/src/assets/js/api.js',
        maxHistoryItems: 10,
        autoClearMessages: true,
        autoClearTimeout: 5000,
        enableAnalytics: false
    },

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('Initializing VidGrabber...');
            
            // Initialize UI components
            UI.initialize();
            
            // Check API health
            await this.checkApiHealth();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Restore saved state
            this.restoreState();
            
            // Set up analytics if enabled
            if (this.config.enableAnalytics) {
                this.setupAnalytics();
            }
            
            console.log('VidGrabber initialized successfully!');
            
            // Show welcome message
            setTimeout(() => {
                UI.showMessage('Welcome to VidGrabber! Paste a video URL to start.', 'info');
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            UI.showMessage('Failed to initialize application. Please refresh the page.', 'error');
        }
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const { downloadForm, videoUrlInput, menuToggle } = UI.elements;
        
        // Form submission
        if (downloadForm) {
            downloadForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // URL input events
        if (videoUrlInput) {
            // Auto-fill from clipboard on focus
            videoUrlInput.addEventListener('focus', () => {
                this.attemptClipboardPaste();
            });
            
            // Clear results when input changes
            videoUrlInput.addEventListener('input', () => {
                if (this.state.currentVideoUrl !== videoUrlInput.value.trim()) {
                    UI.clearResults();
                }
            });
            
            // Handle Enter key
            videoUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (downloadForm) downloadForm.requestSubmit();
                }
            });
        }
        
        // Example URL buttons (you can add these to your HTML)
        this.setupExampleButtons();
        
        // History management
        this.setupHistoryManagement();
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.restoreState();
        });
    },

    /**
     * Handle form submission
     * @param {Event} e - Form submit event
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const { videoUrlInput } = UI.elements;
        const url = videoUrlInput.value.trim();
        
        if (!url) {
            UI.showMessage('Please enter a video URL', 'error');
            return;
        }
        
        if (!Utils.isValidUrl(url)) {
            UI.showMessage('Please enter a valid video URL from a supported platform', 'error');
            return;
        }
        
        // Update state
        this.state.currentVideoUrl = url;
        this.state.isProcessing = true;
        
        // Save to history
        this.addToHistory(url);
        
        // Show loading
        UI.showLoading();
        UI.clearResults();
        UI.showMessage('Fetching video information...', 'info');
        
        try {
            // Get video info from API
            const videoInfo = await API.getVideoInfo(url);
            
            if (videoInfo.success) {
                // Update state
                this.state.currentVideoInfo = videoInfo;
                
                // Display results
                UI.displayVideoInfo(videoInfo);
                
                // Update URL in browser (without page reload)
                this.updateBrowserUrl(url);
                
                UI.showMessage(`Found ${videoInfo.formats.length} formats for "${videoInfo.title}"`, 'success');
            } else {
                UI.showMessage(videoInfo.error || 'Failed to get video information', 'error');
                this.state.currentVideoInfo = null;
            }
        } catch (error) {
            console.error('Error fetching video info:', error);
            UI.showMessage('Network error. Please check your connection and try again.', 'error');
            this.state.currentVideoInfo = null;
        } finally {
            // Hide loading
            UI.hideLoading();
            this.state.isProcessing = false;
        }
    },

    /**
     * Handle download button click
     * @param {string} formatId - Format ID to download
     */
    async handleDownload(formatId) {
        if (!this.state.currentVideoUrl || !this.state.currentVideoInfo) {
            UI.showMessage('Please analyze a video first', 'error');
            return;
        }
        
        if (this.state.isProcessing) {
            UI.showMessage('Please wait for current operation to complete', 'warning');
            return;
        }
        
        // Update state
        this.state.currentFormat = formatId;
        this.state.isProcessing = true;
        
        // Update button state
        UI.updateDownloadButton(formatId, true, 'Getting link...');
        UI.showMessage('Preparing download...', 'info');
        
        try {
            // Get download link
            const downloadResult = await API.smartDownload(
                this.state.currentVideoUrl,
                formatId
            );
            
            if (downloadResult.success) {
                // Track download in history
                this.trackDownload(formatId);
                
                // Show success message
                UI.showMessage(downloadResult.message || 'Download started!', 'success');
                
                // Log analytics if enabled
                if (this.config.enableAnalytics) {
                    this.logDownloadEvent(downloadResult);
                }
            } else {
                UI.showMessage(downloadResult.error || 'Download failed', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            UI.showMessage('Download failed. Please try again.', 'error');
        } finally {
            // Update button state
            UI.updateDownloadButton(formatId, false);
            this.state.isProcessing = false;
            
            // Auto-clear success message
            if (this.config.autoClearMessages) {
                setTimeout(() => {
                    UI.hideMessage();
                }, this.config.autoClearTimeout);
            }
        }
    },

    /**
     * Check API health
     */
    async checkApiHealth() {
        try {
            const health = await API.checkHealth();
            this.state.apiHealth = health.status === 'healthy' ? 'healthy' : 'unhealthy';
            
            if (this.state.apiHealth === 'unhealthy') {
                UI.showMessage('API server is not responding. Some features may not work.', 'warning');
            }
        } catch (error) {
            this.state.apiHealth = 'unreachable';
            UI.showMessage('Cannot connect to download server. Please check your connection.', 'error');
        }
    },

    /**
     * Attempt to paste from clipboard
     */
    async attemptClipboardPaste() {
        const { videoUrlInput } = UI.elements;
        
        if (!videoUrlInput || videoUrlInput.value.trim()) return;
        
        try {
            const text = await navigator.clipboard.readText();
            if (text && Utils.isValidUrl(text)) {
                // Check if user wants to paste
                if (confirm('Found a video URL in your clipboard. Would you like to paste it?')) {
                    videoUrlInput.value = text;
                    videoUrlInput.focus();
                }
            }
        } catch (error) {
            // Clipboard access not granted or empty
            // Silently fail
        }
    },

    /**
     * Add URL to history
     * @param {string} url - Video URL
     */
    addToHistory(url) {
        // Remove if already exists
        this.state.downloadHistory = this.state.downloadHistory.filter(
            item => item.url !== url
        );
        
        // Add to beginning
        this.state.downloadHistory.unshift({
            url,
            timestamp: Date.now(),
            title: 'Pending...'
        });
        
        // Limit history size
        if (this.state.downloadHistory.length > this.config.maxHistoryItems) {
            this.state.downloadHistory.pop();
        }
        
        // Save to localStorage
        this.saveState();
        
        // Update UI if history panel exists
        this.updateHistoryUI();
    },

    /**
     * Track successful download
     * @param {string} formatId - Downloaded format ID
     */
    trackDownload(formatId) {
        if (!this.state.currentVideoInfo) return;
        
        // Find the format info
        const format = this.state.currentVideoInfo.formats.find(
            f => f.format_id === formatId
        );
        
        if (format) {
            // Update history item
            const historyItem = this.state.downloadHistory.find(
                item => item.url === this.state.currentVideoUrl
            );
            
            if (historyItem) {
                historyItem.title = this.state.currentVideoInfo.title;
                historyItem.format = format;
                historyItem.downloadedAt = Date.now();
                
                // Save to localStorage
                this.saveState();
                
                // Update UI
                this.updateHistoryUI();
            }
        }
    },

    /**
     * Update browser URL without page reload
     * @param {string} url - Video URL to encode in browser URL
     */
    updateBrowserUrl(url) {
        try {
            const params = new URLSearchParams();
            params.set('url', encodeURIComponent(url));
            
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ url }, '', newUrl);
        } catch (error) {
            console.error('Failed to update browser URL:', error);
        }
    },

    /**
     * Restore state from URL or localStorage
     */
    restoreState() {
        try {
            // Restore from URL parameters
            const params = new URLSearchParams(window.location.search);
            const urlParam = params.get('url');
            
            if (urlParam) {
                const url = decodeURIComponent(urlParam);
                const { videoUrlInput } = UI.elements;
                
                if (videoUrlInput && url) {
                    videoUrlInput.value = url;
                    // Auto-fetch if URL looks valid
                    if (Utils.isValidUrl(url)) {
                        setTimeout(() => {
                            if (downloadForm) downloadForm.requestSubmit();
                        }, 500);
                    }
                }
            }
            
            // Restore history from localStorage
            const savedHistory = localStorage.getItem('vidgrabber_history');
            if (savedHistory) {
                this.state.downloadHistory = JSON.parse(savedHistory);
                this.updateHistoryUI();
            }
            
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
    },

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('vidgrabber_history', 
                JSON.stringify(this.state.downloadHistory));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    },

    /**
     * Update history UI
     */
    updateHistoryUI() {
        // You can implement a history panel in your HTML
        // This is a placeholder for history UI updates
        const historyPanel = document.getElementById('historyPanel');
        if (!historyPanel) return;
        
        if (this.state.downloadHistory.length === 0) {
            historyPanel.innerHTML = '<p class="empty-history">No download history yet.</p>';
            return;
        }
        
        let html = '<h4>Recent Downloads:</h4><ul class="history-list">';
        
        this.state.downloadHistory.forEach(item => {
            const timeAgo = Utils.formatRelativeTime(item.timestamp);
            html += `
                <li class="history-item">
                    <div class="history-item-content">
                        <strong>${item.title || 'Unknown Video'}</strong>
                        <small>${timeAgo}</small>
                    </div>
                    <button class="history-item-action" onclick="App.loadFromHistory('${item.url}')">
                        <i class="fas fa-redo"></i>
                    </button>
                </li>
            `;
        });
        
        html += '</ul>';
        historyPanel.innerHTML = html;
    },

    /**
     * Load URL from history
     * @param {string} url - Video URL from history
     */
    loadFromHistory(url) {
        const { videoUrlInput, downloadForm } = UI.elements;
        
        if (videoUrlInput && url) {
            videoUrlInput.value = url;
            videoUrlInput.focus();
            
            // Auto-submit if form exists
            if (downloadForm) {
                setTimeout(() => {
                    downloadForm.requestSubmit();
                }, 300);
            }
        }
    },

    /**
     * Setup example URL buttons
     */
    setupExampleButtons() {
        // You can add example buttons to your HTML like:
        // <div class="example-urls" id="exampleUrls"></div>
        const exampleContainer = document.getElementById('exampleUrls');
        if (!exampleContainer) return;
        
        const examples = [
            {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                title: 'Example: YouTube Video'
            },
            {
                url: 'https://vimeo.com/148751763',
                title: 'Example: Vimeo Video'
            }
        ];
        
        let html = '<p class="example-title">Try these examples:</p>';
        examples.forEach(example => {
            html += `
                <button class="example-btn" onclick="App.loadExample('${example.url}')">
                    ${example.title}
                </button>
            `;
        });
        
        exampleContainer.innerHTML = html;
    },

    /**
     * Load example URL
     * @param {string} url - Example URL
     */
    loadExample(url) {
        const { videoUrlInput, downloadForm } = UI.elements;
        
        if (videoUrlInput) {
            videoUrlInput.value = url;
            videoUrlInput.focus();
            
            if (downloadForm) {
                setTimeout(() => {
                    downloadForm.requestSubmit();
                }, 300);
            }
        }
    },

    /**
     * Setup analytics (if enabled)
     */
    setupAnalytics() {
        // Basic analytics tracking
        // In a real app, you'd integrate with Google Analytics, etc.
        console.log('Analytics enabled');
        
        // Track page views
        this.trackPageView();
        
        // Track form submissions
        const { downloadForm } = UI.elements;
        if (downloadForm) {
            downloadForm.addEventListener('submit', () => {
                this.trackEvent('form_submit', {
                    url_length: this.state.currentVideoUrl.length
                });
            });
        }
    },

    /**
     * Track page view
     */
    trackPageView() {
        if (!this.config.enableAnalytics) return;
        
        console.log('Page view tracked:', window.location.pathname);
        // Implement your analytics tracking here
    },

    /**
     * Track custom event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    trackEvent(eventName, data = {}) {
        if (!this.config.enableAnalytics) return;
        
        console.log('Event tracked:', eventName, data);
        // Implement your analytics tracking here
    },

    /**
     * Log download event
     * @param {Object} downloadResult - Download result from API
     */
    logDownloadEvent(downloadResult) {
        if (!this.config.enableAnalytics) return;
        
        this.trackEvent('download_started', {
            format: downloadResult.format,
            resolution: downloadResult.resolution,
            method: downloadResult.method,
            success: downloadResult.success
        });
    },

    /**
     * Setup history management UI
     */
    setupHistoryManagement() {
        // Add clear history button if history panel exists
        const historyPanel = document.getElementById('historyPanel');
        if (!historyPanel) return;
        
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-history-btn';
        clearBtn.innerHTML = '<i class="fas fa-trash"></i> Clear History';
        clearBtn.onclick = () => this.clearHistory();
        
        historyPanel.appendChild(clearBtn);
    },

    /**
     * Clear download history
     */
    clearHistory() {
        if (confirm('Are you sure you want to clear your download history?')) {
            this.state.downloadHistory = [];
            localStorage.removeItem('vidgrabber_history');
            this.updateHistoryUI();
            UI.showMessage('Download history cleared', 'success');
        }
    },

    /**
     * Get app version
     * @returns {string} App version
     */
    getVersion() {
        return '1.0.0';
    },

    /**
     * Get app status
     * @returns {Object} App status information
     */
    getStatus() {
        return {
            version: this.getVersion(),
            apiHealth: this.state.apiHealth,
            historyCount: this.state.downloadHistory.length,
            isProcessing: this.state.isProcessing,
            currentVideo: this.state.currentVideoInfo ? this.state.currentVideoInfo.title : null
        };
    },

    /**
     * Export app data
     * @returns {Object} App data for export
     */
    exportData() {
        return {
            version: this.getVersion(),
            exportDate: new Date().toISOString(),
            history: this.state.downloadHistory,
            settings: this.config
        };
    },

    /**
     * Import app data
     * @param {Object} data - Data to import
     */
    importData(data) {
        // Validate data
        if (!data || !data.history || !Array.isArray(data.history)) {
            throw new Error('Invalid data format');
        }
        
        // Import history
        this.state.downloadHistory = data.history.slice(0, this.config.maxHistoryItems);
        this.saveState();
        this.updateHistoryUI();
        
        UI.showMessage('Data imported successfully', 'success');
    }
};

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.initialize();
    });
} else {
    App.initialize();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
} else {
    window.App = App;
}
