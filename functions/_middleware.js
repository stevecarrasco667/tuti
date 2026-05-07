/**
 * Cloudflare Pages Function — Social Bot Interceptor
 * 
 * Detecta bots de redes sociales (WhatsApp, Discord, Telegram, etc.) y
 * les sirve HTML estático con meta tags personalizadas POR SALA, para que
 * el preview del link de invitación sea irresistible.
 *
 * Los usuarios reales reciben la SPA de Vue normalmente.
 */

// Bots de redes sociales conocidos
const SOCIAL_BOT_PATTERN = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Discordbot|LinkedInBot|Slackbot|Baiduspider|Applebot/i;

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // Si no es un bot de redes sociales, pasar a la SPA normalmente
    if (!SOCIAL_BOT_PATTERN.test(userAgent)) {
        return next();
    }

    // ── RUTA /lobby/:roomId ────────────────────────────────────────────────
    const lobbyMatch = url.pathname.match(/^\/lobby\/([A-Z0-9]{4,8})$/i);
    if (lobbyMatch) {
        const roomId = lobbyMatch[1].toUpperCase();
        const pageUrl = `https://tutigame.pages.dev/lobby/${roomId}`;
        const html = buildHtml({
            title: `🎮 ¡Te invitan a jugar Tutti Frutti! — Sala ${roomId} | TutiGame`,
            description: `Únete a la sala ${roomId}. Haz clic para entrar directamente — gratis, sin registro, en tu navegador.`,
            url: pageUrl,
            image: 'https://tutigame.pages.dev/og-image.png',
            redirectTo: pageUrl,
        });
        return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
    }

    // ── RUTA / (Home) ─────────────────────────────────────────────────────
    if (url.pathname === '/' || url.pathname === '') {
        const html = buildHtml({
            title: 'TutiGame — Jugar Tutti Frutti Online Gratis con Amigos',
            description: 'El clásico Tutti Frutti en línea. Crea una sala, comparte el link y juega con amigos en tiempo real. ¡Gratis y sin registro!',
            url: 'https://tutigame.pages.dev/',
            image: 'https://tutigame.pages.dev/og-image.png',
            redirectTo: 'https://tutigame.pages.dev/',
        });
        return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
    }

    // Para cualquier otra ruta, servir la SPA normalmente
    return next();
}

/**
 * Genera un HTML mínimo con todos los meta tags necesarios para
 * un preview de red social correcto.
 */
function buildHtml({ title, description, url, image, redirectTo }) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <link rel="canonical" href="${escapeHtml(url)}"/>

  <!-- Open Graph (WhatsApp, Facebook, iMessage) -->
  <meta property="og:type"        content="website"/>
  <meta property="og:url"         content="${escapeHtml(url)}"/>
  <meta property="og:title"       content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:image"       content="${escapeHtml(image)}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:locale"      content="es_ES"/>
  <meta property="og:site_name"   content="TutiGame"/>

  <!-- Twitter Card (Discord también la usa) -->
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${escapeHtml(title)}"/>
  <meta name="twitter:description" content="${escapeHtml(description)}"/>
  <meta name="twitter:image"       content="${escapeHtml(image)}"/>

  <meta http-equiv="refresh" content="0; url=${escapeHtml(redirectTo)}"/>
</head>
<body>
  <p>Redirigiendo a TutiGame...</p>
  <a href="${escapeHtml(redirectTo)}">Entrar al juego →</a>
</body>
</html>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
