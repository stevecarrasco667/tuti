// vite.config.ts
import { defineConfig } from "file:///C:/Users/fuige/OneDrive/Escritorio/tuti2/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/fuige/OneDrive/Escritorio/tuti2/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { VitePWA } from "file:///C:/Users/fuige/OneDrive/Escritorio/tuti2/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/fuige/OneDrive/Escritorio/tuti2/vite.config.ts";
var packageJsonPath = path.resolve(fileURLToPath(__vite_injected_original_import_meta_url), "../package.json");
var pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3}"]
      },
      manifest: {
        name: "TutiGame",
        short_name: "TutiGame",
        description: "El cl\xE1sico Tutifruti en l\xEDnea con tus amigos",
        theme_color: "#7c3aed",
        background_color: "#0f0a1e",
        display: "standalone",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  // [Sprint 4 — Cold Start] Base ABSOLUTA obligatoria para SPAs con rutas profundas.
  // Con './' (relativo), /lobby/HCWD intenta cargar ./assets/index.css → /lobby/assets/index.css → 404.
  // Con '/' (absoluto), siempre carga /assets/index.css sin importar la profundidad de la ruta.
  base: "/",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared")
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/vue/") || id.includes("node_modules/vue-router")) {
            return "vendor-core";
          }
          if (id.includes("node_modules/partysocket") || id.includes("node_modules/fast-json-patch")) {
            return "vendor-network";
          }
          if (id.includes("/shared/engines/") || id.includes("/shared/systems/")) {
            return "game-engines";
          }
          if (id.includes("node_modules")) {
            return "vendor-utils";
          }
        }
      }
    }
  },
  server: {
    proxy: {
      "/party": {
        target: "http://127.0.0.1:1999",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxmdWlnZVxcXFxPbmVEcml2ZVxcXFxFc2NyaXRvcmlvXFxcXHR1dGkyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxmdWlnZVxcXFxPbmVEcml2ZVxcXFxFc2NyaXRvcmlvXFxcXHR1dGkyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9mdWlnZS9PbmVEcml2ZS9Fc2NyaXRvcmlvL3R1dGkyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnXHJcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJ1xyXG5cclxuY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5yZXNvbHZlKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSwgJy4uL3BhY2thZ2UuanNvbicpO1xyXG5jb25zdCBwa2cgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGYtOCcpKTtcclxuXHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKVxyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIGRlZmluZToge1xyXG4gICAgICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocGtnLnZlcnNpb24pLFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgICB2dWUoKSxcclxuICAgICAgICBWaXRlUFdBKHtcclxuICAgICAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgICAgICAgIGluamVjdFJlZ2lzdGVyOiAnYXV0bycsXHJcbiAgICAgICAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICAgICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2ZyxtcDN9J11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdUdXRpR2FtZScsXHJcbiAgICAgICAgICAgICAgICBzaG9ydF9uYW1lOiAnVHV0aUdhbWUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFbCBjbFx1MDBFMXNpY28gVHV0aWZydXRpIGVuIGxcdTAwRURuZWEgY29uIHR1cyBhbWlnb3MnLFxyXG4gICAgICAgICAgICAgICAgdGhlbWVfY29sb3I6ICcjN2MzYWVkJyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMGYwYTFlJyxcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICAgICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQtcHJpbWFyeScsXHJcbiAgICAgICAgICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tMTkyLnBuZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogJy9pY29ucy9pY29uLTUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgXSxcclxuICAgIC8vIFtTcHJpbnQgNCBcdTIwMTQgQ29sZCBTdGFydF0gQmFzZSBBQlNPTFVUQSBvYmxpZ2F0b3JpYSBwYXJhIFNQQXMgY29uIHJ1dGFzIHByb2Z1bmRhcy5cclxuICAgIC8vIENvbiAnLi8nIChyZWxhdGl2byksIC9sb2JieS9IQ1dEIGludGVudGEgY2FyZ2FyIC4vYXNzZXRzL2luZGV4LmNzcyBcdTIxOTIgL2xvYmJ5L2Fzc2V0cy9pbmRleC5jc3MgXHUyMTkyIDQwNC5cclxuICAgIC8vIENvbiAnLycgKGFic29sdXRvKSwgc2llbXByZSBjYXJnYSAvYXNzZXRzL2luZGV4LmNzcyBzaW4gaW1wb3J0YXIgbGEgcHJvZnVuZGlkYWQgZGUgbGEgcnV0YS5cclxuICAgIGJhc2U6ICcvJyxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NoYXJlZCcpXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXHJcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIDEuIENodW5rIGRlIENvcmUgRnJhbWV3b3JrIChDYWNoZW8gZGUgbXV5IGxhcmdvIHBsYXpvKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3Z1ZS8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3Z1ZS1yb3V0ZXInKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1jb3JlJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gQ2h1bmsgZGUgUmVkIHkgRXN0YWRvIChQYXJ0eUtpdCwgSlNPTiBQYXRjaClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9wYXJ0eXNvY2tldCcpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZmFzdC1qc29uLXBhdGNoJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItbmV0d29yayc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyAzLiBDaHVuayBkZSBNb3RvcmVzIGRlIEp1ZWdvIENvbXBhcnRpZG9zXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc2hhcmVkL2VuZ2luZXMvJykgfHwgaWQuaW5jbHVkZXMoJy9zaGFyZWQvc3lzdGVtcy8nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2dhbWUtZW5naW5lcyc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyA0LiBDaHVuayBnZW5cdTAwRTlyaWNvIHBhcmEgb3RyYXMgbGlicmVyXHUwMEVEYXMgbWlzY2VsXHUwMEUxbmVhcyAoY2FudmFzLWNvbmZldHRpLCBldGMuKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItdXRpbHMnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgICAgcHJveHk6IHtcclxuICAgICAgICAgICAgJy9wYXJ0eSc6IHtcclxuICAgICAgICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6MTk5OScsXHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICB3czogdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1QsU0FBUyxvQkFBb0I7QUFDblYsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLG9CQUFvQjtBQUs3QixTQUFTLGVBQWU7QUFUMkssSUFBTSwyQ0FBMkM7QUFNcFAsSUFBTSxrQkFBa0IsS0FBSyxRQUFRLGNBQWMsd0NBQWUsR0FBRyxpQkFBaUI7QUFDdEYsSUFBTSxNQUFNLEtBQUssTUFBTSxhQUFhLGlCQUFpQixPQUFPLENBQUM7QUFJN0QsSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLEtBQUssUUFBUSxVQUFVO0FBR3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFFBQVE7QUFBQSxJQUNKLGlCQUFpQixLQUFLLFVBQVUsSUFBSSxPQUFPO0FBQUEsRUFDL0M7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLElBQUk7QUFBQSxJQUNKLFFBQVE7QUFBQSxNQUNKLGNBQWM7QUFBQSxNQUNkLGdCQUFnQjtBQUFBLE1BQ2hCLFNBQVM7QUFBQSxRQUNMLHVCQUF1QjtBQUFBLFFBQ3ZCLGNBQWMsQ0FBQyxvQ0FBb0M7QUFBQSxNQUN2RDtBQUFBLE1BQ0EsVUFBVTtBQUFBLFFBQ04sTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0g7QUFBQSxZQUNJLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNWO0FBQUEsVUFDQTtBQUFBLFlBQ0ksS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ2I7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLElBQ0osQ0FBQztBQUFBLEVBQ0w7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlBLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILFdBQVcsS0FBSyxRQUFRLFdBQVcsVUFBVTtBQUFBLElBQ2pEO0FBQUEsRUFDSjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osYUFBYSxJQUFJO0FBRWIsY0FBSSxHQUFHLFNBQVMsbUJBQW1CLEtBQUssR0FBRyxTQUFTLHlCQUF5QixHQUFHO0FBQzVFLG1CQUFPO0FBQUEsVUFDWDtBQUdBLGNBQUksR0FBRyxTQUFTLDBCQUEwQixLQUFLLEdBQUcsU0FBUyw4QkFBOEIsR0FBRztBQUN4RixtQkFBTztBQUFBLFVBQ1g7QUFHQSxjQUFJLEdBQUcsU0FBUyxrQkFBa0IsS0FBSyxHQUFHLFNBQVMsa0JBQWtCLEdBQUc7QUFDcEUsbUJBQU87QUFBQSxVQUNYO0FBR0EsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQzdCLG1CQUFPO0FBQUEsVUFDWDtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUVBLFFBQVE7QUFBQSxJQUNKLE9BQU87QUFBQSxNQUNILFVBQVU7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLElBQUk7QUFBQSxNQUNSO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
