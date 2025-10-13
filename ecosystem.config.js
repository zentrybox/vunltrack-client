module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "start",
      cwd: "/home/vulntrack/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      error_log: "./logs/pm2-error.log",
      out_log: "./logs/pm2-out.log",
      log_log: "./logs/pm2-combined.log",
      time: true,
      watch: false,
      ignore_watch: [
        "node_modules",
        ".next",
        ".git",
        "logs"
      ]
    }
  ]
};