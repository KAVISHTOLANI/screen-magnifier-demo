import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Focus Field', () => {
  it('switches magnifier modes and zoom with the keyboard', async () => {
    window.location.hash = '/magnifier';
    const user = userEvent.setup();
    render(<App />);
    const stage = screen.getByRole('group', { name: /Magnifier stage, lens at 2.5×/ });
    stage.focus();
    await user.keyboard('+');
    expect(screen.getByRole('group', { name: /lens at 3×/ })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Full-screen zoom' }));
    expect(screen.getByRole('group', { name: /full-screen zoom at 3×/ })).toBeInTheDocument();
  });

  it('validates the sample form and keeps the lens copy in sync', async () => {
    window.location.hash = '/magnifier';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Reserve a place' }));
    expect(screen.getAllByText('Enter your name to reserve.')).toHaveLength(2);
    expect(screen.getAllByLabelText('Your name')[0]).toHaveAccessibleDescription('Enter your name to reserve.');
    await user.type(screen.getAllByLabelText('Your name')[0], 'Ada');
    await user.click(screen.getByRole('button', { name: 'Reserve a place' }));
    // Both the real page and the inert lens copy show the confirmation.
    expect(screen.getAllByText(/Place reserved for Ada/)).toHaveLength(2);
  });

  it('grades contrast for each theme', async () => {
    window.location.hash = '/contrast';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('fails')).toHaveTextContent('4 checks fail WCAG AA.');
    const table = screen.getByRole('table', { name: /Site default/ });
    expect(within(within(table).getByRole('rowheader', { name: /Helper text/ }).closest('tr')!).getByText('Fail')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Yellow on black/ }));
    expect(screen.getByTestId('fails')).toHaveTextContent('Every check passes WCAG AA.');
    await user.selectOptions(screen.getByLabelText('Text size'), '2');
    await user.click(screen.getByLabelText('WCAG text-spacing override'));
    expect(document.querySelector('.sample')).toHaveClass('spaced');
  });

  it('measures focus styles and follows the background', async () => {
    window.location.hash = '/focus';
    const user = userEvent.setup();
    render(<App />);
    const row = (name: RegExp) => within(screen.getByRole('button', { name }).closest('tr')!);
    expect(row(/2px ring/).getByText('Meets 2.4.13 (AAA)')).toBeInTheDocument();
    expect(row(/Removed/).getByText('Not visible')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Background #000000' }));
    expect(row(/2px ring/).getByText('Visible only (2.4.7 AA)')).toBeInTheDocument();
    expect(row(/Two-tone/).getByText('Meets 2.4.13 (AAA)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Two-tone ring' }));
    expect(screen.getByTestId('css')).toHaveTextContent('box-shadow: 0 0 0 2px #ffffff;');
    expect(screen.getByTestId('focus-demo')).toHaveClass('fs-double');
    await user.clear(screen.getByLabelText('Control width (px)'));
    await user.type(screen.getByLabelText('Control width (px)'), '5');
    expect(screen.getByText('Width 16–600 and height 16–200 px.')).toBeInTheDocument();
  });
});
