module.exports = {
  apps: [{
    name: 'aniva-staging',
    cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3061',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: '3061',
      AUTH_TRUST_HOST: '1',
      DATABASE_URL: 'postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging',
    },
    max_memory_restart: '500M',
    restart_delay: 3000,
  }],
};
