import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApiKeyModal from '../ApiKeyModal';

describe('ApiKeyModal', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render modal with title and input', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    expect(screen.getByText('OpenAI APIキーの設定')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('should disable save button when input is empty', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    const saveButton = screen.getByText('設定');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when valid key is entered', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    const input = screen.getByPlaceholderText('sk-...');
    fireEvent.change(input, { target: { value: 'sk-1234567890abcdefghijklmn' } });
    
    const saveButton = screen.getByText('設定');
    expect(saveButton).not.toBeDisabled();
  });

  it('should show error for invalid API key', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    const input = screen.getByPlaceholderText('sk-...');
    fireEvent.change(input, { target: { value: 'invalid-key' } });
    
    const saveButton = screen.getByText('設定');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('APIキーが無効です。sk-で始まる正しいキーを入力してください。')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onSave with valid API key', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    const validKey = 'sk-1234567890abcdefghijklmn';
    const input = screen.getByPlaceholderText('sk-...');
    fireEvent.change(input, { target: { value: validKey } });
    
    const saveButton = screen.getByText('設定');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith(validKey);
  });

  it('should toggle password visibility', () => {
    render(<ApiKeyModal onSave={mockOnSave} />);
    
    const input = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(input.type).toBe('password');
    
    const toggleButton = screen.getByText('表示');
    fireEvent.click(toggleButton);
    
    expect(input.type).toBe('text');
    expect(screen.getByText('隠す')).toBeInTheDocument();
  });
});