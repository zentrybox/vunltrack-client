module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "start",
      cwd: "/root/nextjs-frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      error_log: "/var/log/pm2/vunltrack-frontend-error.log",
      out_log: "/var/log/pm2/vunltrack-frontend-out.log",
      log_log: "/var/log/pm2/vunltrack-frontend-combined.log",
      time: true,
      watch: false,
      ignore_watch: [
        "node_modules",
        ".next",
        ".git"
      ]
    }
  ]
};