const express = require('express');
const cors = require('cors');
const todosRouter = require('./routes/todos');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/todos', todosRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
