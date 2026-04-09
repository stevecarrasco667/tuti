import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router/index'

const app = createApp(App);
app.use(router);

// [Phoenix P0] Global Error Boundary
app.config.errorHandler = (err, _instance, info) => {
    console.error('[Vue Global Error]:', err);
    console.info('[Vue Component Info]:', info);
};

// [Phoenix P0] Unhandled Promise Rejection Catcher
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', event.reason);
});

app.mount('#app');
