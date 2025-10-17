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
   // Database
      DATABASE_URL: "postgresql://mediator_user:132H1gh$t@localhost:5434/mediator_pro",
      
      // App-specific variables
      REPLIT_DOMAINS: "pro.mediator.life",
      SESSION_SECRET: "d86082a3aee19bb1de1449e24992d7e891dcb1b804c9f9e963d8d7fc68a0b6da"
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
