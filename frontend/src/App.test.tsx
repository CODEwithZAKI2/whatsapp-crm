import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test.skip('renders WhatsApp CRM title', () => {
  render(<App />);
  const titleElement = screen.getByText(/WhatsApp CRM/i);
  expect(titleElement).toBeInTheDocument();
});
