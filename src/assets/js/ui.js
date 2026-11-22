// ui.js - UI management functions

const UI = {
    // DOM elements cache
    elements: {},

    /**
     * Initialize UI elements
     */
    initialize() {
        // Cache frequently used elements
        this.elements = {
            // Form elements
            downloadForm: document.getElementById('downloadForm'),
            videoUrlInput: document.getElementById('videoUrl'),
            submitBtn: document.getElementById('submitBtn'),
            
            // Display elements
            loadingDiv: document.getElementById('loading'),
            resultsDiv: document.getElementById('results'),
            messageDiv: document.getElementById('message'),
            downloadCard: document.getElementById('downloadCard'),
            
            // Navigation
            menuToggle: document.getElementById('menuToggle'),
            nav: document.querySelector('.nav'),
            
            // Sections
            heroSection: document.querySelector('.hero'),
            featuresSection: document.getElementById('features'),
            howToSection: document.getElementById('how-to'),
            supportedSection: document.getElementById('supported')
        };

        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Initialize smooth scrolling
        this.initializeSmoothScroll();
        
        // Initialize form validation
        this.initializeFormValidation();
    },

    /**
     * Initialize mobile menu functionality
     */
    initializeMobileMenu() {
        const { menuToggle, nav } = this.elements;
        
        if (!menuToggle || !nav) return;
        
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = nav.classList.contains('active') 
                    ? 'fas fa-times' 
                    : 'fas fa-bars';
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && 
                !nav.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                nav.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });

        // Close menu on link click
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });
    },

    /**
     * Initialize smooth scrolling for anchor links
     */
    initializeSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    },

    /**
     * Initialize form validation
     */
    initializeFormValidation() {
        const { videoUrlInput } = this.elements;
        
        if (!videoUrlInput) return;
        
        // Real-time URL validation
        videoUrlInput.addEventListener('input', () => {
            this.validateUrlInput();
        });
        
        // Clear validation on focus
        videoUrlInput.addEventListener('focus', () => {
            this.clearInputValidation();
        });
    },

    /**
     * Validate URL input in real-time
     */
    validateUrlInput() {
        const { videoUrlInput } = this.elements;
        const url = videoUrlInput.value.trim();
        
        if (!url) {
            this.clearInputValidation();
            return false;
        }
        
        const isValid = Utils.isValidUrl(url);
        
        if (isValid) {
            videoUrlInput.classList.remove('invalid');
            videoUrlInput.classList.add('valid');
        } else {
            videoUrlInput.classList.remove('valid');
            videoUrlInput.classList.add('invalid');
        }
        
        return isValid;
    },

    /**
     * Clear input validation styles
     */
    clearInputValidation() {
        const { videoUrlInput } = this.elements;
        videoUrlInput.classList.remove('valid', 'invalid');
    },

    /**
     * Show loading state
     */
    showLoading() {
        const { loadingDiv, submitBtn } = this.elements;
        
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            const spinner = submitBtn.querySelector('i');
            if (spinner) {
                spinner.className = 'fas fa-spinner fa-spin';
            }
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        const { loadingDiv, submitBtn } = this.elements;
        
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Get Video';
        }
    },

    /**
     * Show message to user
     * @param {string} text - Message text
     * @param {string} type - Message type (success, error, info, warning)
     * @param {number} autoHide - Auto hide timeout in ms (0 = don't auto hide)
     */
    showMessage(text, type = 'info', autoHide = 5000) {
        const { messageDiv } = this.elements;
        
        if (!messageDiv) {
            this.createMessageContainer();
        }
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        };
        
        const icon = iconMap[type] || 'info-circle';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${icon}"></i>
                <span>${text}</span>
            </div>
            <button class="close-message" onclick="UI.hideMessage()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        messageDiv.className = `message message-${type}`;
        messageDiv.style.display = 'flex';
        
        // Auto hide for non-error messages
        if (autoHide > 0 && type !== 'error') {
            setTimeout(() => {
                this.hideMessage();
            }, autoHide);
        }
        
        // Scroll to message if it's not visible
        if (!this.isElementInViewport(messageDiv)) {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    /**
     * Hide current message
     */
    hideMessage() {
        const { messageDiv } = this.elements;
        if (messageDiv) {
            messageDiv.style.display = 'none';
            messageDiv.innerHTML = '';
        }
    },

    /**
     * Create message container if it doesn't exist
     */
    createMessageContainer() {
        const { downloadCard } = this.elements;
        
        if (!downloadCard || this.elements.messageDiv) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.className = 'message';
        
        // Insert after download card
        downloadCard.parentNode.insertBefore(messageDiv, downloadCard.nextSibling);
        this.elements.messageDiv = messageDiv;
    },

    /**
     * Clear results section
     */
    clearResults() {
        const { resultsDiv } = this.elements;
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
        }
    },

    /**
     * Display video information and formats
     * @param {Object} data - Video data from API
     */
    displayVideoInfo(data) {
        const { resultsDiv } = this.elements;
        
        if (!resultsDiv) return;
        
        if (!data.formats || data.formats.length === 0) {
            this.showNoFormatsMessage();
            return;
        }
        
        // Create results HTML
        let html = this.createVideoInfoHTML(data);
        html += this.createFormatsHTML(data.formats);
        
        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
        
        // Scroll to results
        setTimeout(() => {
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    },

    /**
     * Create video information HTML
     * @param {Object} data - Video data
     * @returns {string} HTML string
     */
    createVideoInfoHTML(data) {
        const duration = data.duration ? Utils.formatDuration(data.duration) : null;
        const platform = Utils.getVideoPlatform(data.webpage_url || data.url);
        
        return `
            <div class="video-info">
                <div class="video-thumbnail">
                    <img src="${data.thumbnail || this.getDefaultThumbnail()}" 
                         alt="${data.title || 'Video thumbnail'}"
                         onerror="this.src='${this.getDefaultThumbnail()}'">
                </div>
                <div class="video-details">
                    <h3 class="video-title">${data.title || 'Untitled Video'}</h3>
                    <div class="video-meta">
                        ${platform ? `<div><i class="fas fa-play-circle"></i> ${platform}</div>` : ''}
                        ${duration ? `<div><i class="far fa-clock"></i> ${duration}</div>` : ''}
                        ${data.uploader ? `<div><i class="fas fa-user"></i> ${data.uploader}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Create formats grid HTML
     * @param {Array} formats - Array of format objects
     * @returns {string} HTML string
     */
    createFormatsHTML(formats) {
        // Sort formats by quality
        const sortedFormats = [...formats].sort((a, b) => {
            return Utils.getQualityScore(b) - Utils.getQualityScore(a);
        });
        
        let html = `
            <div class="formats-container">
                <h4>Available Formats (${sortedFormats.length}):</h4>
                <div class="formats-grid">
        `;
        
        sortedFormats.forEach(format => {
            html += this.createFormatCardHTML(format);
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    },

    /**
     * Create format card HTML
     * @param {Object} format - Format object
     * @returns {string} HTML string
     */
    createFormatCardHTML(format) {
        const isCombined = format.has_video && format.has_audio;
        const typeBadge = isCombined ? 'Video+Audio' : format.has_video ? 'Video Only' : 'Audio Only';
        const typeIcon = isCombined ? 'fas fa-film' : format.has_video ? 'fas fa-video' : 'fas fa-volume-up';
        
        return `
            <div class="format-card">
                <div class="format-header">
                    <span class="format-type">${format.ext.toUpperCase()}</span>
                    <span class="format-resolution">${format.resolution || 'N/A'}</span>
                </div>
                <div class="format-details">
                    <p><i class="${typeIcon}"></i> ${typeBadge}</p>
                    <p><i class="fas fa-hdd"></i> ${format.filesize || 'Unknown size'}</p>
                    <p><i class="fas fa-tag"></i> ${format.format_note || 'Standard Quality'}</p>
                    ${format.vcodec && format.vcodec !== 'none' ? `<p><i class="fas fa-code"></i> ${format.vcodec}</p>` : ''}
                    ${format.acodec && format.acodec !== 'none' ? `<p><i class="fas fa-wave-square"></i> ${format.acodec}</p>` : ''}
                </div>
                <button class="download-btn" onclick="App.handleDownload('${format.format_id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
    },

    /**
     * Show no formats available message
     */
    showNoFormatsMessage() {
        const { resultsDiv } = this.elements;
        
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = `
            <div class="no-formats">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>No Downloadable Formats Found</h4>
                <p>This video might be restricted or unavailable for download.</p>
                <button class="btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-redo"></i> Try Another Video
                </button>
            </div>
        `;
        resultsDiv.style.display = 'block';
    },

    /**
     * Update download button state
     * @param {string} formatId - Format ID
     * @param {boolean} isLoading - Whether button is loading
     * @param {string} text - Button text
     */
    updateDownloadButton(formatId, isLoading, text = null) {
        const button = document.querySelector(`button[onclick*="${formatId}"]`);
        if (!button) return;
        
        const icon = button.querySelector('i');
        const originalText = button.dataset.originalText || button.innerHTML;
        
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
        
        if (isLoading) {
            button.disabled = true;
            if (icon) icon.className = 'fas fa-spinner fa-spin';
            button.innerHTML = text ? `<i class="fas fa-spinner fa-spin"></i> ${text}` : '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    },

    /**
     * Get default thumbnail URL
     * @returns {string} Default thumbnail URL
     */
    getDefaultThumbnail() {
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9" width="200" height="120"><rect width="16" height="9" fill="%23667eea"/><text x="8" y="5" font-family="Arial" font-size="2" fill="white" text-anchor="middle" dominant-baseline="middle">VIDEO</text></svg>';
    },

    /**
     * Check if element is in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is in viewport
     */
    isElementInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Toggle element visibility
     * @param {HTMLElement} element - Element to toggle
     * @param {boolean} show - Whether to show the element
     */
    toggleElement(element, show) {
        if (!element) return;
        element.style.display = show ? 'block' : 'none';
    },

    /**
     * Add CSS class to element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class to add
     */
    addClass(element, className) {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    },

    /**
     * Remove CSS class from element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class to remove
     */
    removeClass(element, className) {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    },

    /**
     * Scroll to element
     * @param {string|HTMLElement} element - Element or selector
     * @param {Object} options - Scroll options
     */
    scrollToElement(element, options = {}) {
        const target = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;
        
        if (!target) return;
        
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            ...options
        });
    },

    /**
     * Create and show modal
     * @param {string} title - Modal title
     * @param {string} content - Modal content
     * @param {Array} buttons - Array of button objects
     */
    showModal(title, content, buttons = []) {
        // Remove existing modal
        this.hideModal();
        
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="modalOverlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="UI.hideModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${buttons.length > 0 ? `
                        <div class="modal-footer">
                            ${buttons.map(btn => `
                                <button class="${btn.class || 'btn-primary'}" 
                                        onclick="${btn.onclick}">
                                    ${btn.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add modal styles if not already present
        this.addModalStyles();
    },

    /**
     * Hide modal
     */
    hideModal() {
        const existingModal = document.getElementById('modalOverlay');
        if (existingModal) {
            existingModal.remove();
        }
    },

    /**
     * Add modal styles to document
     */
    addModalStyles() {
        if (document.getElementById('modal-styles')) return;
        
        const styles = `
            <style id="modal-styles">
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.3s ease;
                }
                
                .modal {
                    background: white;
                    border-radius: 15px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #666;
                    cursor: pointer;
                    padding: 0;
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
} else {
    window.UI = UI;
}