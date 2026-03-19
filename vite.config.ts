import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5413,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-push.js',
      manifestFilename: "manifest.json",
      includeAssets: [
        "favicon.ico",
        "preorder_logo.jpg",
        "robots.txt",
        "sitemap.xml",
      ],
      manifest: {
        name: "preorder.food - Campus Food Pre-ordering",
        short_name: "preorder.food",
        description:
          "Pre-order your favourite food from your campus canteen. Skip the queue, save time.",
        theme_color: "#f97316",
        background_color: "#0f0f0f",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "preorder_logo.jpg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "preorder_logo.jpg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "maskable",
          },
          {
            src: "preorder_logo.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "preorder_logo.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "maskable",
          },
        ],
        categories: ["food", "lifestyle", "utilities"],
        screenshots: [],
        shortcuts: [
          {
            name: "Order Food",
            short_name: "Order",
            description: "Browse canteens and place an order",
            url: "/student",
            icons: [{ src: "preorder_logo.jpg", sizes: "96x96" }],
          },
          {
            name: "My Orders",
            short_name: "Orders",
            description: "View your active and past orders",
            url: "/student/orders",
            icons: [{ src: "preorder_logo.jpg", sizes: "96x96" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
