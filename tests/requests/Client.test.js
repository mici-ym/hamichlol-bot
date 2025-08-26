import Client from '../../src/requests/Client.js';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Client.edit error handling', () => {
  let client;

  beforeEach(() => {
  client = new Client();
  client.isLogedIn = true;
  client.token = { csrftoken: 'test-token' };
});

test('should throw an error when edit fails', async () => {
  client.edit = jest.fn().mockRejectedValue(new Error('Edit failed: API error'));

  await expect(client.edit({ title: 'Test', text: 'Content' })).rejects.toThrow('Edit failed: API error');
  expect(client.edit).toHaveBeenCalledWith({ title: 'Test', text: 'Content' });
});

test('should throw and log an error when edit throws an exception', async () => {
  const errorMessage = 'Network error';
  client.edit = jest.fn().mockRejectedValue(new Error(errorMessage));

  await expect(client.edit({ title: 'Test', text: 'Content' })).rejects.toThrow(errorMessage);
  expect(client.edit).toHaveBeenCalledWith({ title: 'Test', text: 'Content' });
});

  test('should handle and rethrow errors with custom messages', async () => {
    client.edit = jest.fn().mockRejectedValue(new Error('Custom error'));

    await expect(client.edit({ title: 'Test', text: 'Content' })).rejects.toThrow('Custom error');
    expect(client.edit).toHaveBeenCalledWith({ title: 'Test', text: 'Content' });
  });

  test('should log errors using the logger', async () => {
    const mockLogger = { error: jest.fn() };
    client.logger = mockLogger;
    client.edit = jest.fn().mockRejectedValue(new Error('Logging test'));

    await expect(client.edit({ title: 'Test', text: 'Content' })).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith('Error in edit: Logging test');
  });

  test('should handle errors when token is missing', async () => {
    delete client.token.csrftoken;

    await expect(client.edit({ title: 'Test', text: 'Content' })).rejects.toThrow();
    expect(client.edit).not.toHaveBeenCalled();
  });
});