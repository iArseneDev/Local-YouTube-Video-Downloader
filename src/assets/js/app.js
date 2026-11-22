const App = {
    currentVideoUrl: '',
    busy: false,

    async initialize() {
        UI.initialize();
        try {
            await API.checkHealth();
        } catch {
            UI.showMessage('The API is not responding. Check that the server is running, then try again.', 'warning');
        }
    },

    async handleAnalyze() {
        if (this.busy) return;
        const url = UI.elements.input.value.trim();
        if (!Utils.isValidUrl(url)) {
            UI.showMessage('Enter a valid URL from a supported video site.', 'error');
            return;
        }

        this.busy = true;
        this.currentVideoUrl = url;
        UI.clearResults();
        UI.setLoading(true);
        UI.showMessage('Looking up video details…', 'info');
        try {
            const data = await API.getVideoInfo(url);
            UI.showVideoInfo(data);
            UI.showMessage('Video information is ready.', 'success');
        } catch (error) {
            UI.showMessage(error.message || 'Could not analyze this video. Try again.', 'error');
        } finally {
            UI.setLoading(false);
            this.busy = false;
        }
    },

    async handleDownload(formatId, button) {
        if (this.busy || !this.currentVideoUrl) return;
        this.busy = true;
        UI.setDownloadButton(button, true);
        try {
            const { job_id: jobId } = await API.startDownload(this.currentVideoUrl, formatId);
            UI.showDownloadProgress({ status: 'starting', percent: 0 });
            let state;
            do {
                await new Promise(resolve => setTimeout(resolve, 1000));
                state = await API.getDownloadStatus(jobId);
                UI.showDownloadProgress(state);
                if (state.status === 'error') throw new Error(state.error || 'Download failed.');
            } while (state.status !== 'complete');
            UI.showMessage('Download ready. Saving the video to your device…', 'success');
            const blob = await API.downloadFile(jobId);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${(document.querySelector('.video-title')?.textContent || 'video').replace(/[\\/:*?"<>|]/g, '_')}.mp4`;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            UI.showMessage('Your video is ready and downloading.', 'success');
        } catch (error) {
            UI.showMessage(error.message || 'Could not prepare the download. Analyze the video again.', 'error');
        } finally {
            UI.setDownloadButton(button, false);
            this.busy = false;
        }
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.initialize());
