module.exports = {
  apps: [{
    name: 'aniva-web',
    script: 'node_modules/.bin/next',
    args: 'start -p 3050',
    cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
    env: {
      NODE_ENV: 'production',
      PORT: 3050,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
  }],
};
