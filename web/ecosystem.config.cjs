module.exports = {
  apps: [
    {
      name: 'aniva',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3050',
      cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
      },
    },
    {
      name: 'aniva-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3061',
      cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
      env: {
        NODE_ENV: 'production',
        PORT: '3061',
        DATABASE_URL: 'postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging',
        NEXTAUTH_URL: 'https://demo.aniva-project.com',
      },
    },
  ],
};
