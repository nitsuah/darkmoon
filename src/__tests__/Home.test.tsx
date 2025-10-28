import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { expect, describe, it } from 'vitest';
import Home from '../pages/Home';
import { BrowserRouter } from 'react-router-dom';

describe('Home Page', () => {
  it('renders the main header', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(/PLAY🌑DARKMOON/i)).toBeInTheDocument();
  });
});
