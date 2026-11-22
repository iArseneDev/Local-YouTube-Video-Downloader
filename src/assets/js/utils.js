const Utils = {
    formatDuration(seconds) {
        if (seconds == null || Number.isNaN(Number(seconds))) return 'Unknown duration';
        const value = Number(seconds);
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        const secs = Math.floor(value % 60);
        return hours
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            : `${minutes}:${String(secs).padStart(2, '0')}`;
    },

    isValidUrl(value) {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
            const host = url.hostname.toLowerCase().replace(/\.$/, '');
            const domains = ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'vimeo.com', 'dailymotion.com', 'dai.ly', 'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'tiktok.com', 'instagram.com'];
            return domains.some(domain => host === domain || host.endsWith(`.${domain}`));
        } catch {
            return false;
        }
    },

    getVideoPlatform(value) {
        const host = (value || '').toLowerCase();
        if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
        if (host.includes('vimeo')) return 'Vimeo';
        if (host.includes('dailymotion') || host.includes('dai.ly')) return 'Dailymotion';
        if (host.includes('facebook') || host.includes('fb.watch')) return 'Facebook';
        if (host.includes('twitter') || host.includes('x.com')) return 'X / Twitter';
        if (host.includes('tiktok')) return 'TikTok';
        if (host.includes('instagram')) return 'Instagram';
        return 'Video';
    }
};

window.Utils = Utils;
