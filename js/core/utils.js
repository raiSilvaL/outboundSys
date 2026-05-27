/**
 * Utilitários compartilhados para o Outbound System
 */

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 15000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
}

function updateDateTime() {
    const now = new Date();
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.textContent = `${dayName}, ${day}/${month}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        lastUpdated.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function parseAnyDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    // Tenta DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(y, m - 1, d);
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function getScoreColor(score) {
    if (!score) return '#ef4444';
    const val = typeof score === 'string' ? parseFloat(score.replace('%', '')) : score;
    if (val >= 90) return '#10b981';
    if (val >= 70) return '#38bdf8';
    if (val >= 50) return '#f59e0b';
    return '#ef4444';
}
