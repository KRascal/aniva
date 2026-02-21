module.exports = {
  apps: [
    {
      name: 'aniva',
      cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
      script: '/home/openclaw/.openclaw/workspace/projects/aniva/node_modules/next/dist/bin/next',
      args: 'start -p 3050',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
        AUTH_TRUST_HOST: '1',
      },
      max_memory_restart: '500M',
      restart_delay: 3000,
    },
  ],
};
