import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router/index'

const app = createApp(App);
app.use(router);

import { logErrorToSupabase } from './utils/telemetry';

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
