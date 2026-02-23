const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/todos - list all todos with optional filters
router.get('/', (req, res) => {
  const { completed, priority, search } = req.query;

  let sql = 'SELECT * FROM todos WHERE 1=1';
  const params = [];

  if (completed !== undefined) {
    sql += ' AND completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }

  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }

  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY createdAt DESC';

  const todos = db.prepare(sql).all(...params);
  res.json(todos.map(normalizeTodo));
});

// GET /api/todos/:id - get single todo
router.get('/:id', (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  res.json(normalizeTodo(todo));
});

// POST /api/todos - create new todo
router.post('/', (req, res) => {
  const { title, description, priority, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }

  const stmt = db.prepare(
    'INSERT INTO todos (title, description, priority, dueDate) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(
    title.trim(),
    description?.trim() || null,
    priority || 'medium',
    dueDate || null
  );

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(normalizeTodo(todo));
});

// PUT /api/todos/:id - update todo
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const { title, description, completed, priority, dueDate } = req.body;

  if (title !== undefined && (!title || !title.trim())) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }

  const stmt = db.prepare(`
    UPDATE todos SET
      title = ?,
      description = ?,
      completed = ?,
      priority = ?,
      dueDate = ?,
      updatedAt = datetime('now')
    WHERE id = ?
  `);

  stmt.run(
    title !== undefined ? title.trim() : existing.title,
    description !== undefined ? (description?.trim() || null) : existing.description,
    completed !== undefined ? (completed ? 1 : 0) : existing.completed,
    priority || existing.priority,
    dueDate !== undefined ? dueDate : existing.dueDate,
    req.params.id
  );

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  res.json(normalizeTodo(todo));
});

// PATCH /api/todos/:id/toggle - toggle completed status
router.patch('/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  db.prepare(
    "UPDATE todos SET completed = ?, updatedAt = datetime('now') WHERE id = ?"
  ).run(existing.completed ? 0 : 1, req.params.id);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  res.json(normalizeTodo(todo));
});

// DELETE /api/todos/:id - delete todo
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Todo deleted' });
});

function normalizeTodo(todo) {
  return {
    ...todo,
    completed: !!todo.completed
  };
}

module.exports = router;
