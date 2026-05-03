import { createApp } from 'vue'
// @ts-ignore: ignora el error de tipos si npm install falló por red
import * as Sentry from '@sentry/vue'
import './style.css'
import App from './App.vue'
import { router } from './router/index'
import { i18n } from './i18n'

const app = createApp(App);
app.use(router);
app.use(i18n);

// [Sprint 3] Observability - Frontend Sentry Integration
// IMPORTANT: init AFTER app.use() calls so integrations like browserTracing
// can access the router. The init() call installs its own app.config.errorHandler.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
    Sentry.init({
        app,
        dsn: sentryDsn,
        integrations: [
            Sentry.browserTracingIntegration({ router }),
            Sentry.replayIntegration(),
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
    });
}

// [Sprint H7] Global Vue Error Boundary
// NOTE: We do NOT override app.config.errorHandler here because Sentry.init()
// already installed its own. Instead, we chain our telemetry after Sentry's.
const _sentryVueHandler = app.config.errorHandler;
app.config.errorHandler = (err, instance, info) => {
    // Let Sentry's handler run first (if installed)
    if (_sentryVueHandler) _sentryVueHandler(err, instance, info);
    else console.error('[Vue Global Error]:', err);
};

// [Sprint H7] Global Unhandled Promise Rejection Catcher
window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
});

// [Sprint H7] Global Native Error Catcher
window.addEventListener('error', (event) => {
    Sentry.captureException(event.error || new Error(event.message));
});

app.mount('#app');
