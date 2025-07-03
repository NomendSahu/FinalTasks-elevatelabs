// 1. Updated vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const plugins = [react()];

  // Only add plugins in development
  if (process.env.NODE_ENV !== "production") {
    plugins.push(runtimeErrorOverlay());
    
    if (process.env.REPL_ID !== undefined) {
      try {
        const { cartographer } = await import("@replit/vite-plugin-cartographer");
        plugins.push(cartographer());
      } catch (error) {
        console.warn("Failed to load cartographer plugin:", error);
      }
    }
  }

  return {
    plugins,
    // CRITICAL: Set correct base for GitHub Pages
    base: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '/',
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['wouter'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
          }
        }
      }
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});

---

// 2. Updated client/index.html (replace your current one)
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>SoloTracker - Habit Mastery</title>
    <meta name="description" content="Level up your habits with Solo Leveling-inspired gamified tracking. Earn XP, unlock ranks, and master your daily quests.">
    <link rel="manifest" href="./manifest.json">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <meta name="theme-color" content="#0F1419">
    <link rel="apple-touch-icon" href="./icon-192.png">
    
    <!-- GitHub Pages SPA routing script -->
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // MIT License
      // https://github.com/rafgraph/spa-github-pages
      (function(l) {
        if (l.search[1] === '/' ) {
          var decoded = l.search.slice(1).split('&').map(function(s) { 
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(null, null,
            l.pathname.slice(0, -1) + decoded + l.hash
          );
        }
      }(window.location))
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>

---

// 3. Create public/404.html (for GitHub Pages SPA routing)
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SoloTracker - Habit Mastery</title>
    <script type="text/javascript">
        // Single Page Apps for GitHub Pages
        // MIT License
        // https://github.com/rafgraph/spa-github-pages
        var pathSegmentsToKeep = 1;
        var l = window.location;
        l.replace(
            l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
            l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
            l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
            (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
            l.hash
        );
    </script>
</head>
<body>
</body>
</html>

---

// 4. Create .github/workflows/deploy.yml
name: Deploy SoloTracker to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment
concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type check
        run: npm run check
        
      - name: Build for production
        run: npm run build:pages
        env:
          NODE_ENV: production
          
      - name: Copy 404.html for SPA routing
        run: cp dist/404.html dist/404.html || cp client/public/404.html dist/404.html
        
      - name: Setup Pages
        uses: actions/configure-pages@v5
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

---

// 5. Update package.json scripts
{
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/index.ts",
    "build": "tsc --noEmit && vite build",
    "build:pages": "NODE_ENV=production vite build",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "preview": "vite preview --port 4173",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}

---

// 6. Update client/src/main.tsx for proper routing
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Handle GitHub Pages routing - get base path from environment
const basename = import.meta.env.PROD && import.meta.env.BASE_URL !== '/' 
  ? import.meta.env.BASE_URL.replace(/\/$/, '') 
  : '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App basename={basename} />
  </React.StrictMode>,
)

---

// 7. Create public/manifest.json (if not exists)
{
  "name": "SoloTracker - Habit Mastery",
  "short_name": "SoloTracker",
  "description": "Level up your habits with Solo Leveling-inspired gamified tracking",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#0F1419",
  "theme_color": "#0F1419",
  "icons": [
    {
      "src": "./icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

---

// 8. Environment files
// .env.production
VITE_BASE_URL=https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/

// .env.development
VITE_BASE_URL=http://localhost:5173/
