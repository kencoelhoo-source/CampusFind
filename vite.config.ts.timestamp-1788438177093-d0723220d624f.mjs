// vite.config.ts
import { defineConfig } from "file:///C:/Users/hp/OneDrive/Desktop/Projects/CampusFind/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/hp/OneDrive/Desktop/Projects/CampusFind/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\hp\\OneDrive\\Desktop\\Projects\\CampusFind";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: true
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react")) {
              return "react-vendor";
            }
            if (id.includes("@supabase/supabase-js")) {
              return "supabase";
            }
            if (id.includes("@tanstack/react-query")) {
              return "react-query";
            }
          }
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFByb2plY3RzXFxcXENhbXB1c0ZpbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGhwXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcUHJvamVjdHNcXFxcQ2FtcHVzRmluZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvaHAvT25lRHJpdmUvRGVza3RvcC9Qcm9qZWN0cy9DYW1wdXNGaW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIxMjcuMC4wLjFcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiB0cnVlLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInJlYWN0LXJvdXRlci1kb21cIikgfHwgaWQuaW5jbHVkZXMoXCJyZWFjdC1kb21cIikgfHwgaWQuaW5jbHVkZXMoXCJyZWFjdFwiKSkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJyZWFjdC12ZW5kb3JcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInN1cGFiYXNlXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiKSkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJyZWFjdC1xdWVyeVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1YsU0FBUyxvQkFBb0I7QUFDN1csT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsa0JBQWtCLEtBQUssR0FBRyxTQUFTLFdBQVcsS0FBSyxHQUFHLFNBQVMsT0FBTyxHQUFHO0FBQ3ZGLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyx1QkFBdUIsR0FBRztBQUN4QyxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsdUJBQXVCLEdBQUc7QUFDeEMscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
