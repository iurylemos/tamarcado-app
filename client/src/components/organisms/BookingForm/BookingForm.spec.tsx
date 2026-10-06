import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookingForm from './BookingForm';

describe('BookingForm', () => {
  it('rejects an invalid phone and defaults WhatsApp consent to false', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);

    const phoneInput = screen.getByLabelText(/Celular com DDD/i);
    const consent = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', {
      name: 'Solicitar agendamento',
    });

    expect(submitButton).toBeDisabled();
    fireEvent.click(consent);

    fireEvent.change(phoneInput, {
      target: { value: '123' },
    });

    fireEvent.click(submitButton);

    expect(
      await screen.findByText('Informe um telefone brasileiro válido com DDD.'),
    ).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(phoneInput, {
      target: { value: '(11) 99999-0000' },
    });

    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        customerName: '',
        customerPhone: '(11) 99999-0000',
        whatsappOptIn: true,
      }),
    );
  });

  it('requires WhatsApp consent before submitting even if the form is submitted directly', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<BookingForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Solicitar agendamento' }).closest('form')!);

    expect(await screen.findByText(/Aceite receber mensagens pelo WhatsApp/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
