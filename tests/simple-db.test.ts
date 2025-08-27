/**
 * Simple database test to validate basic functionality
 */

import { CSFDatabase } from '../src/db/database.js';

describe('Simple Database Test', () => {
  let testDb: CSFDatabase;
  
  beforeAll(async () => {
    // Create a simple test database
    testDb = new CSFDatabase('./simple-test.db');
    
    // Verify it works
    const stmt = testDb.prepare('SELECT 1 as test');
    const result = stmt.get();
    expect(result.test).toBe(1);
  });

  afterAll(async () => {
    // Cleanup
    try {
      const fs = await import('fs');
      if (fs.existsSync('./simple-test.db')) {
        fs.unlinkSync('./simple-test.db');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create statements successfully', () => {
    const stmt = testDb.prepare('SELECT ? as value');
    expect(stmt).toBeTruthy();
    expect(typeof stmt.run).toBe('function');
    expect(typeof stmt.get).toBe('function');
    
    const result = stmt.get('test-value');
    expect(result.value).toBe('test-value');
  });
  
  test('should handle database operations', () => {
    // Test that basic database operations work
    const createStmt = testDb.prepare(`
      CREATE TEMP TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT
      )
    `);
    createStmt.run();
    
    const insertStmt = testDb.prepare(`
      INSERT INTO test_table (name) VALUES (?)
    `);
    const result = insertStmt.run('test-name');
    expect(result.changes).toBe(1);
    
    const selectStmt = testDb.prepare(`
      SELECT name FROM test_table WHERE id = ?
    `);
    const row = selectStmt.get(result.lastInsertRowid);
    expect(row.name).toBe('test-name');
  });
});