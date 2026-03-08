module.exports = {
  apps: [
    {
      name: 'aniva',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3050',
      cwd: '/home/openclaw/.openclaw/workspace/projects/aniva/web',
      node_args: '--max-old-space-size=512',
      // ゼロダウンタイムデプロイ: pm2 reload aniva
      instances: 2,
      exec_mode: 'cluster',
      // Graceful shutdown
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: false,
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
      },
      // Crash loop防止
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      max_memory_restart: '400M',
      exp_backoff_restart_delay: 1000,
      // ログ
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
