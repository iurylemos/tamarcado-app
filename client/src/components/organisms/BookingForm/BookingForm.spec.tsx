import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookingForm from './BookingForm';

afterEach(cleanup);

describe('BookingForm', () => {
  it('requires a name, masks the phone, and waits for WhatsApp consent before submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Seu nome');
    const phoneInput = screen.getByLabelText(/Celular com DDD/i);
    const consent = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', {
      name: 'Solicitar agendamento',
    });

    expect(submitButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Maria Silva' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(phoneInput, {
      target: { value: '123' },
    });

    expect(await screen.findByText('Informe um celular válido com DDD.')).toBeInTheDocument();
    expect(phoneInput).toHaveValue('(12) 3');
    expect(submitButton).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(phoneInput, {
      target: { value: '(11) 99999-0000' },
    });
    expect(phoneInput).toHaveValue('(11) 99999-0000');
    expect(submitButton).toBeDisabled();

    fireEvent.click(consent);
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        customerName: 'Maria Silva',
        customerPhone: '(11) 99999-0000',
        whatsappOptIn: true,
      }),
    );
  });

  it('validates required fields even if browser controls are bypassed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);
    const form = screen.getByRole('button', { name: 'Solicitar agendamento' }).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu nome.');
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Maria Silva' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe um celular válido com DDD.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the focused name input mounted while its controlled value changes', () => {
    render(<BookingForm onSubmit={vi.fn().mockResolvedValue(undefined)} />);
    const nameInput = screen.getByLabelText('Seu nome');
    nameInput.focus();

    fireEvent.change(nameInput, { target: { value: 'Maria Silva' } });

    expect(document.activeElement).toBe(nameInput);
    expect(nameInput).toHaveValue('Maria Silva');
  });

  it('shows an accessible skeleton while the booking request is pending', () => {
    const { container } = render(
      <BookingForm onSubmit={vi.fn().mockResolvedValue(undefined)} busy />,
    );
    const submitButton = screen.getByRole('button', { name: 'Enviando solicitação...' });

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.booking-submit-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Enviando solicitação...')).toHaveClass('skeleton-status');
  });
});
