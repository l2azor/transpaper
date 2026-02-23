import { test, expect } from '@playwright/test';

const API = 'http://localhost:6172';

// Clear all todos via API before each test
test.beforeEach(async ({ request }) => {
  const res = await request.get(`${API}/api/todos`);
  const todos = await res.json();
  for (const todo of todos) {
    await request.delete(`${API}/api/todos/${todo.id}`);
  }
});

test.describe('Todo App', () => {
  test('should display the app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('My Todo');
  });

  test('should show empty state when no todos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No todos yet')).toBeVisible();
  });

  test('should create a new todo', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('Add a new todo...').fill('Buy groceries');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Buy groceries')).toBeVisible();
  });

  test('should toggle a todo as completed', async ({ page, request }) => {
    // Create a todo via API
    await request.post(`${API}/api/todos`, {
      data: { title: 'Complete me' },
    });

    await page.goto('/');
    await expect(page.getByText('Complete me')).toBeVisible();

    // Click the toggle button (the round circle button)
    const todoItem = page.locator('div').filter({ hasText: /^Complete me/ }).first();
    await todoItem.locator('button').first().click();

    // Verify the todo is now in completed state (has line-through style)
    await expect(page.locator('.line-through')).toBeVisible();
  });

  test('should delete a todo', async ({ page, request }) => {
    await request.post(`${API}/api/todos`, {
      data: { title: 'Delete me' },
    });

    await page.goto('/');
    await expect(page.getByText('Delete me')).toBeVisible();

    // Click the delete icon button (last button in the item)
    const todoRow = page.locator('div').filter({ hasText: /Delete me/ }).locator('button[title="Delete"]');
    await todoRow.click();

    // Confirm the delete
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete me')).not.toBeVisible();
    await expect(page.getByText('No todos yet')).toBeVisible();
  });

  test('should filter todos', async ({ page, request }) => {
    // Create two todos, one completed
    await request.post(`${API}/api/todos`, {
      data: { title: 'Active todo' },
    });

    await request.post(`${API}/api/todos`, {
      data: { title: 'Done todo' },
    });

    // Toggle second todo to completed via API
    const allRes = await request.get(`${API}/api/todos`);
    const allTodos = await allRes.json();
    const doneTodo = allTodos.find((t: { title: string }) => t.title === 'Done todo');
    await request.patch(`${API}/api/todos/${doneTodo.id}/toggle`);

    await page.goto('/');

    // Both todos visible by default
    await expect(page.getByText('Active todo')).toBeVisible();
    await expect(page.getByText('Done todo')).toBeVisible();

    // Click "Active" filter
    await page.getByRole('button', { name: /Active/ }).click();
    await expect(page.getByText('Active todo')).toBeVisible();
    await expect(page.getByText('Done todo')).not.toBeVisible();

    // Click "Completed" filter
    await page.getByRole('button', { name: /Completed/ }).click();
    await expect(page.getByText('Done todo')).toBeVisible();
    await expect(page.getByText('Active todo')).not.toBeVisible();

    // Click "All" filter
    await page.getByRole('button', { name: /^All/ }).click();
    await expect(page.getByText('Active todo')).toBeVisible();
    await expect(page.getByText('Done todo')).toBeVisible();
  });

  test('should search todos', async ({ page, request }) => {
    await request.post(`${API}/api/todos`, {
      data: { title: 'Buy milk' },
    });
    await request.post(`${API}/api/todos`, {
      data: { title: 'Read book' },
    });

    await page.goto('/');

    await page.getByPlaceholder('Search todos...').fill('milk');
    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Read book')).not.toBeVisible();

    await page.getByPlaceholder('Search todos...').fill('book');
    await expect(page.getByText('Read book')).toBeVisible();
    await expect(page.getByText('Buy milk')).not.toBeVisible();
  });

  test('should create a todo with priority and due date', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('Add a new todo...').fill('Important task');

    // Expand the form
    await page.getByTitle('More options').click();

    // Set priority
    await page.locator('select').selectOption('high');

    // Set due date
    await page.locator('input[type="date"]').fill('2026-12-31');

    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Important task')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
  });

  test('should edit a todo', async ({ page, request }) => {
    await request.post(`${API}/api/todos`, {
      data: { title: 'Original title' },
    });

    await page.goto('/');
    await expect(page.getByText('Original title')).toBeVisible();

    // Click edit button
    await page.locator('button[title="Edit"]').click();

    // Wait for the Save button to appear (indicating edit mode)
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    // The edit input is the focused element with autoFocus
    const editInput = page.getByRole('textbox').nth(2);
    await expect(editInput).toHaveValue('Original title');

    // Clear and type new title
    await editInput.fill('Updated title');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Updated title')).toBeVisible();
    await expect(page.getByText('Original title')).not.toBeVisible();
  });
});
