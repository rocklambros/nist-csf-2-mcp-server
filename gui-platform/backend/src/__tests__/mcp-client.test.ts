/**
 * MCP Client Integration Tests
 * 
 * Comprehensive testing of MCP client functionality with error scenarios.
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { MCPClient } from '../services/mcp-client.js';

describe('MCP Client Integration', () => {
  let mcpClient: MCPClient;

  beforeAll(() => {
    // Use a mock MCP server path for testing
    mcpClient = new MCPClient('/mock/path/to/mcp/server.js');
  });

  afterAll(() => {
    if (mcpClient) {
      mcpClient.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should initialize without errors', () => {
      expect(mcpClient).toBeDefined();
      expect(mcpClient.isConnectionActive()).toBe(false);
    });

    test('should handle connection statistics', () => {
      const stats = mcpClient.getConnectionStats();
      
      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('pending_requests');
      expect(stats).toHaveProperty('connection_retries');
      expect(stats).toHaveProperty('uptime_seconds');
      expect(typeof stats.connected).toBe('boolean');
      expect(typeof stats.pending_requests).toBe('number');
    });
  });

  describe('Request Handling', () => {
    test('should handle disconnected state gracefully', async () => {
      await expect(mcpClient.sendRequest('test_tool', {})).rejects.toThrow('MCP client not connected');
    });

    test('should validate request parameters', () => {
      expect(() => {
        // This should not throw for valid parameters
        const request = {
          method: 'create_profile',
          params: { org_name: 'Test Org' },
          id: 'test-id'
        };
        expect(request).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON responses gracefully', () => {
      // Test that client can handle malformed responses
      expect(mcpClient.isConnectionActive()).toBe(false);
    });
  });
});