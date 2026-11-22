const UI = {
    initialize() {
        this.elements = {
            form: document.getElementById('downloadForm'),
            input: document.getElementById('videoUrl'),
            submit: document.getElementById('submitBtn'),
            loading: document.getElementById('loading'),
            results: document.getElementById('results'),
            message: document.getElementById('message'),
            menuToggle: document.getElementById('menuToggle'),
            nav: document.querySelector('.nav')
        };
        this.elements.menuToggle?.addEventListener('click', () => {
            const { menuToggle, nav } = this.elements;
            const open = nav.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(open));
            menuToggle.innerHTML = `<i class="fas fa-${open ? 'times' : 'bars'}"></i>`;
        });
        this.elements.nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            this.elements.nav.classList.remove('active');
            this.elements.menuToggle?.setAttribute('aria-expanded', 'false');
        }));
        this.elements.form?.addEventListener('submit', event => {
            event.preventDefault();
            window.App.handleAnalyze();
        });
        this.elements.results?.addEventListener('click', event => {
            const button = event.target.closest('[data-format-id]');
            if (button) window.App.handleDownload(button.dataset.formatId, button);
        });
    },

    showMessage(message, kind = 'info') {
        const box = this.elements.message;
        box.replaceChildren();
        box.className = `message message-${kind}`;
        box.textContent = message;
        box.style.display = 'flex';
    },

    showDownloadProgress(state) {
        const box = this.elements.message;
        const labels = {
            starting: 'Starting download…',
            downloading: 'Downloading video…',
            merging: 'Download received. Combining audio and video…',
            complete: 'Download ready. Saving video…'
        };
        box.replaceChildren();
        box.className = 'message message-info';
        const label = document.createElement('span');
        const percent = state.percent == null ? '' : ` ${state.percent}%`;
        const eta = state.eta == null ? '' : ` · about ${Utils.formatDuration(state.eta)} remaining`;
        label.textContent = `${labels[state.status] || 'Preparing download…'}${percent}${eta}`;
        box.append(label);
        if (state.status === 'downloading' && state.percent != null) {
            const progress = document.createElement('progress');
            progress.max = 100;
            progress.value = state.percent;
            progress.setAttribute('aria-label', 'Download progress');
            box.append(progress);
        }
        box.style.display = 'flex';
    },

    setLoading(loading) {
        this.elements.loading.style.display = loading ? 'block' : 'none';
        this.elements.submit.disabled = loading;
        this.elements.submit.innerHTML = loading
            ? '<i class="fas fa-spinner fa-spin"></i> Processing…'
            : '<i class="fas fa-search"></i> Get Video';
    },

    clearResults() {
        this.elements.results.replaceChildren();
        this.elements.results.style.display = 'none';
    },

    showVideoInfo(data) {
        const root = document.createDocumentFragment();
        const info = document.createElement('section');
        info.className = 'video-info';
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-thumbnail';
        if (data.thumbnail && /^https:\/\//i.test(data.thumbnail)) {
            const image = document.createElement('img');
            image.src = data.thumbnail;
            image.alt = 'Video thumbnail';
            image.referrerPolicy = 'no-referrer';
            thumbnail.append(image);
        }
        const details = document.createElement('div');
        details.className = 'video-details';
        const title = document.createElement('h3');
        title.className = 'video-title';
        title.textContent = data.title || 'Untitled video';
        details.append(title);
        const meta = document.createElement('div');
        meta.className = 'video-meta';
        const platform = document.createElement('p');
        platform.textContent = Utils.getVideoPlatform(data.webpage_url);
        meta.append(platform);
        if (data.duration != null) {
            const duration = document.createElement('p');
            duration.textContent = Utils.formatDuration(data.duration);
            meta.append(duration);
        }
        if (data.uploader) {
            const uploader = document.createElement('p');
            uploader.textContent = data.uploader;
            meta.append(uploader);
        }
        details.append(meta);
        info.append(thumbnail, details);
        root.append(info);

        const formats = Array.isArray(data.formats) ? data.formats : [];
        if (!formats.length) {
            const empty = document.createElement('p');
            empty.className = 'no-formats';
            empty.textContent = 'No compatible downloadable formats were found for this video.';
            root.append(empty);
        } else {
            const section = document.createElement('section');
            section.className = 'formats-container';
            const heading = document.createElement('h4');
            heading.textContent = `Available downloads (${formats.length})`;
            section.append(heading);
            const grid = document.createElement('div');
            grid.className = 'formats-grid';
            formats.forEach(format => {
                const card = document.createElement('article');
                card.className = 'format-card';
                const header = document.createElement('div');
                header.className = 'format-header';
                const ext = document.createElement('span');
                ext.className = 'format-type';
                ext.textContent = String(format.ext || 'file').toUpperCase();
                const resolution = document.createElement('span');
                resolution.className = 'format-resolution';
                resolution.textContent = format.resolution || 'Quality unavailable';
                header.append(ext, resolution);
                const description = document.createElement('p');
                description.className = 'format-description';
                description.textContent = [format.format_note, format.filesize].filter(Boolean).join(' · ') || 'File size unavailable';
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'download-format-btn';
                button.dataset.formatId = format.format_id;
                button.textContent = 'Download';
                card.append(header, description, button);
                grid.append(card);
            });
            section.append(grid);
            root.append(section);
        }
        this.elements.results.replaceChildren(root);
        this.elements.results.style.display = 'block';
        this.elements.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    setDownloadButton(button, loading) {
        if (!button) return;
        button.disabled = loading;
        button.textContent = loading ? 'Preparing…' : 'Download';
    }
};

window.UI = UI;
