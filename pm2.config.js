module.exports = {
  apps: [
    {
      name: 'tn-bustrack-frontend',
      cwd: 'C:\\Users\\NIKILAN\\transit-dashboard',
      script: 'npm',
      args: 'run dev',
      env: { PORT: 3000 }
    },
    {
      name: 'tn-bustrack-backend',
      cwd: 'C:\\Users\\NIKILAN\\transit-dashboard',
      script: 'server/index.js',
      interpreter: 'node',
      env: { PORT: 4000 }
    },
    {
      name: 'tn-bustrack-ngrok',
      cwd: 'C:\\Users\\NIKILAN\\transit-dashboard',
      script: 'ngrok',
      args: 'http 3000 --log=stdout',
      interpreter: '',
      env: {}
    }
  ]
};
