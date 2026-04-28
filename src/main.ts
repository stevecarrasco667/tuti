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

import { logErrorToSupabase } from './utils/telemetry';

// [Sprint 3] Observability - Frontend Sentry Integration
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
    Sentry.init({
        app,
        dsn: sentryDsn,
        integrations: [
            Sentry.browserTracingIntegration({ router }),
            Sentry.replayIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        // Session Replay
        replaysSessionSampleRate: 0.1, 
        replaysOnErrorSampleRate: 1.0,
    });
}

// [Sprint H7] Global Vue Error Boundary (Fallback if ErrorBoundary component doesn't catch it)
app.config.errorHandler = (err, _instance, info) => {
    console.error('[Vue Global Error]:', err);
    logErrorToSupabase(err, 'Vue Global', info);
};

// [Sprint H7] Global Unhandled Promise Rejection Catcher
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', event.reason);
    logErrorToSupabase(event.reason, 'UnhandledRejection');
});

// [Sprint H7] Global Native Error Catcher
window.addEventListener('error', (event) => {
    console.error('[Global Native Error]:', event.error || event.message);
    logErrorToSupabase(event.error || new Error(event.message), 'WindowError');
});

app.mount('#app');
