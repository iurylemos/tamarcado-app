import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookingForm from './BookingForm';

afterEach(cleanup);

describe('BookingForm', () => {
  it('masks the phone and prevents submission until the phone and WhatsApp consent are valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);

    const phoneInput = screen.getByLabelText(/Celular com DDD/i);
    const consent = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', {
      name: 'Solicitar agendamento',
    });

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
        customerName: '',
        customerPhone: '(11) 99999-0000',
        whatsappOptIn: true,
      }),
    );
  });

  it('validates a direct form submission even if browser controls are bypassed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);
    fireEvent.submit(
      screen.getByRole('button', { name: 'Solicitar agendamento' }).closest('form')!,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe um celular válido com DDD.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
