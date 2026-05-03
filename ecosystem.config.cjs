module.exports = {
  apps: [{
    name: 'MediatorPro',
    script: './dist/index.js',
    cwd: '/home/mediator/MediatorPro',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      REPLIT_DOMAINS: "pro.mediator.life",
      PRODUCTION_DOMAIN: "pro.mediator.life"
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
