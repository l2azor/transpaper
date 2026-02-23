module.exports = {
  apps: [
    {
      name: 'mytodo-frontend',
      script: 'npx',
      args: 'vite --host --port 4180',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
