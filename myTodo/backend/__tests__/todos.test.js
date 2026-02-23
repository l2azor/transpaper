const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use a separate test database
const testDbPath = path.join(__dirname, '..', 'data', 'test-todos.db');

beforeAll(() => {
  // Remove old test DB if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

afterAll(() => {
  // Clean up test DB
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// We need to mock the database module before requiring app
jest.mock('../src/database', () => {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const testDbPath = path.join(dataDir, 'test-todos.db');
  const db = new Database(testDbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT 0,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      dueDate TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  return db;
});

const app = require('../src/app');
const db = require('../src/database');

beforeEach(() => {
  db.exec('DELETE FROM todos');
});

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/todos', () => {
  it('should create a new todo with only title', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: 'Test todo' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test todo');
    expect(res.body.completed).toBe(false);
    expect(res.body.priority).toBe('medium');
    expect(res.body.id).toBeDefined();
  });

  it('should create a todo with all fields', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({
        title: 'Full todo',
        description: 'A description',
        priority: 'high',
        dueDate: '2026-12-31',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Full todo');
    expect(res.body.description).toBe('A description');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe('2026-12-31');
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  it('should return 400 when title is empty', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: 'Test', priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Priority must be low, medium, or high');
  });
});

describe('GET /api/todos', () => {
  beforeEach(async () => {
    await request(app).post('/api/todos').send({ title: 'Todo 1', priority: 'high' });
    await request(app).post('/api/todos').send({ title: 'Todo 2', priority: 'low' });
    await request(app).post('/api/todos').send({ title: 'Todo 3', description: 'Important' });
  });

  it('should return all todos', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('should filter by priority', async () => {
    const res = await request(app).get('/api/todos?priority=high');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo 1');
  });

  it('should filter by search term', async () => {
    const res = await request(app).get('/api/todos?search=Important');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo 3');
  });

  it('should filter by completed status', async () => {
    const res = await request(app).get('/api/todos?completed=false');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    res.body.forEach(todo => {
      expect(todo.completed).toBe(false);
    });
  });
});

describe('GET /api/todos/:id', () => {
  it('should return a single todo', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .send({ title: 'Single todo' });
    const id = createRes.body.id;

    const res = await request(app).get(`/api/todos/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Single todo');
  });

  it('should return 404 for non-existent todo', async () => {
    const res = await request(app).get('/api/todos/99999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Todo not found');
  });
});

describe('PUT /api/todos/:id', () => {
  let todoId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: 'Original', description: 'Desc', priority: 'low' });
    todoId = res.body.id;
  });

  it('should update the title', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.description).toBe('Desc');
  });

  it('should update completed status', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('should return 404 for non-existent todo', async () => {
    const res = await request(app)
      .put('/api/todos/99999')
      .send({ title: 'Nope' });

    expect(res.status).toBe(404);
  });

  it('should return 400 for empty title', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title cannot be empty');
  });

  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .put(`/api/todos/${todoId}`)
      .send({ priority: 'urgent' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/todos/:id/toggle', () => {
  it('should toggle completed status', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .send({ title: 'Toggle me' });
    const id = createRes.body.id;

    expect(createRes.body.completed).toBe(false);

    const toggleRes = await request(app).patch(`/api/todos/${id}/toggle`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.completed).toBe(true);

    const toggleRes2 = await request(app).patch(`/api/todos/${id}/toggle`);
    expect(toggleRes2.body.completed).toBe(false);
  });

  it('should return 404 for non-existent todo', async () => {
    const res = await request(app).patch('/api/todos/99999/toggle');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  it('should delete a todo', async () => {
    const createRes = await request(app)
      .post('/api/todos')
      .send({ title: 'Delete me' });
    const id = createRes.body.id;

    const deleteRes = await request(app).delete(`/api/todos/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('Todo deleted');

    const getRes = await request(app).get(`/api/todos/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('should return 404 for non-existent todo', async () => {
    const res = await request(app).delete('/api/todos/99999');
    expect(res.status).toBe(404);
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
