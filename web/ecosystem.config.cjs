module.exports = {
  apps: [
    {
      name: 'aniva',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3050',
      cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
      },
    },
  ],
};
