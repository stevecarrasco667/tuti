/**
 * useMeta — Composable para gestionar metadatos dinámicos de SEO
 *
 * Actualiza el <title>, meta description, Open Graph y Twitter Card
 * en tiempo de ejecución, para que Google (que ejecuta JS) y el
 * historial del navegador reflejen la ruta actual correctamente.
 *
 * NOTA: Para que WhatsApp/Discord muestren previews personalizados al
 * compartir un link de sala, el Cloudflare Worker en functions/_middleware.js
 * se encarga de ello en el servidor. Este composable es complementario.
 */

interface MetaConfig {
    title: string;
    description: string;
    url?: string;
    image?: string;
}

const BASE_URL = 'https://flippo.pages.dev';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export function useMeta() {
    const setMeta = (config: MetaConfig) => {
        // 1. Título de pestaña del navegador
        document.title = config.title;

        const url = config.url || window.location.href;
        const image = config.image || DEFAULT_IMAGE;

        // 2. Meta description
        _setMeta('name', 'description', config.description);

        // 3. Open Graph
        _setOg('og:title',       config.title);
        _setOg('og:description', config.description);
        _setOg('og:url',         url);
        _setOg('og:image',       image);

        // 4. Twitter Card
        _setMeta('name', 'twitter:title',       config.title);
        _setMeta('name', 'twitter:description', config.description);
        _setMeta('name', 'twitter:image',       image);

        // 5. Canonical
        let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;
    };

    const resetMeta = () => {
        setMeta({
            title:       'Flippo — Plataforma de Minijuegos y Party Games Online',
            description: 'Juega con tus amigos a diferentes minijuegos en línea. Crea una sala, comparte el link y juega ahora mismo — ¡gratis y sin registro!',
            url:         BASE_URL + '/',
        });
    };

    return { setMeta, resetMeta };
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _setMeta(attrKey: 'name' | 'property', attrValue: string, content: string) {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attrKey}="${attrValue}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrKey, attrValue);
        document.head.appendChild(el);
    }
    el.content = content;
}

function _setOg(property: string, content: string) {
    _setMeta('property', property, content);
}
