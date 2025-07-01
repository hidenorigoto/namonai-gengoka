import { ApiKeyManager } from '../apiKeyManager';

describe('ApiKeyManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('save', () => {
    it('should save API key to localStorage', () => {
      const testKey = 'sk-test-key-123';
      ApiKeyManager.save(testKey);
      
      expect(localStorage.getItem('openai_api_key')).toBe(testKey);
    });
  });

  describe('get', () => {
    it('should return null when no key is saved', () => {
      expect(ApiKeyManager.get()).toBeNull();
    });

    it('should return saved API key', () => {
      const testKey = 'sk-test-key-456';
      localStorage.setItem('openai_api_key', testKey);
      
      expect(ApiKeyManager.get()).toBe(testKey);
    });
  });

  describe('remove', () => {
    it('should remove API key from localStorage', () => {
      const testKey = 'sk-test-key-789';
      localStorage.setItem('openai_api_key', testKey);
      
      ApiKeyManager.remove();
      
      expect(localStorage.getItem('openai_api_key')).toBeNull();
    });
  });

  describe('validate', () => {
    it('should return true for valid API keys', () => {
      expect(ApiKeyManager.validate('sk-1234567890abcdefghijklmn')).toBe(true);
      expect(ApiKeyManager.validate('sk-proj-1234567890abcdefghijklmn')).toBe(true);
    });

    it('should return false for invalid API keys', () => {
      expect(ApiKeyManager.validate('')).toBe(false);
      expect(ApiKeyManager.validate('invalid-key')).toBe(false);
      expect(ApiKeyManager.validate('sk-short')).toBe(false);
      expect(ApiKeyManager.validate('not-sk-1234567890abcdefghijklmn')).toBe(false);
    });
  });
});