export class ApiKeyManager {
  private static KEY = 'openai_api_key';
  
  static save(apiKey: string): void {
    localStorage.setItem(this.KEY, apiKey);
  }
  
  static get(): string | null {
    return localStorage.getItem(this.KEY);
  }
  
  static remove(): void {
    localStorage.removeItem(this.KEY);
  }
  
  static validate(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }
}