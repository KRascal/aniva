module.exports = {
  apps: [{
    name: 'aniva-staging',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3061',
    cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
    env: {
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: '.env.staging',
    },
  }],
};
