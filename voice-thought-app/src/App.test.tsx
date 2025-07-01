import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders voice thought app', () => {
  render(<App />);
  const headerElement = screen.getByText(/音声思考支援アプリ/i);
  expect(headerElement).toBeInTheDocument();
});
