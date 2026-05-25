/**
 * Animação de Entrada (Preloader)
 */

(function() {
    const text = "OUTBOUND";
    const container = document.getElementById('logoText');
    if (!container) return;

    text.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('letter-intro');
        span.style.animationDelay = `${i * 0.07}s`;
        if(i < 3) span.classList.add('highlight');
        container.appendChild(span);
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if (preloader) {
                preloader.classList.add('hide-loader');
                document.body.style.overflow = 'auto';
                window.dispatchEvent(new CustomEvent('introFinished'));
            }
        }, 3000);
    });
})();
