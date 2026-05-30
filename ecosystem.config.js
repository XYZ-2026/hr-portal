module.exports = {
  apps: [
    {
      name: 'hr-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/hr-portal',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'hr-backend',
      interpreter: 'python3',
      script: '-m',
      args: 'uvicorn main:app --host 0.0.0.0 --port 8000',
      cwd: '/var/www/hr-portal/backend',
      env: {
        SENDER_EMAIL: 'sairamjoshi.cs@gmail.com',
        CC_EMAIL: 'support@collegesimplified.in',
        FRONTEND_URL: 'https://yourdomain.com',
      },
    },
  ],
};
