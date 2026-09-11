module.exports = {
  apps: [
    {
      name: 'zensend-server',
      script: 'server.js', // Or 'npx tsx server.ts' if running TypeScript directly
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        ALLOWED_ORIGINS: 'https://zentyr.online,http://localhost:3000',
        ENABLE_RENDER_KEEPALIVE: 'false',
      },
    },
  ],
};
