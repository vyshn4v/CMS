/**
 * PM2 Process Manager Configuration for CMS Headless Monolith
 * Runs NestJS API on port 5000 and serves static React SPA from apps/web/dist
 */
module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'cms-api',
      script: 'apps/api/dist/main.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      node_args: '--max-old-space-size=180',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        STATIC_PATH: 'apps/web/dist',
      },
    },
  ],
};
