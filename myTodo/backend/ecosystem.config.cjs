module.exports = {
  apps: [
    {
      name: 'mytodo-backend',
      script: 'src/index.js',
      cwd: __dirname,
      env: {
        PORT: 4179,
        NODE_ENV: 'development'
      }
    }
  ]
};
