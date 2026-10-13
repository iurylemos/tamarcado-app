import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceLayout } from './index';

vi.mock('../contexts/auth/auth.context', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('../pages/AppointmentDetailsPage', () => ({ default: () => null }));
vi.mock('../pages/AppointmentsPage', () => ({ default: () => null }));
vi.mock('../pages/CustomersPage', () => ({ default: () => null }));
vi.mock('../pages/MessagesPage', () => ({ default: () => null }));
vi.mock('../pages/ReportsPage', () => ({ default: () => null }));

afterEach(cleanup);

describe('WorkspaceLayout', () => {
  it('uses the PWA icon as the collaborator brand', () => {
    render(
      <MemoryRouter initialEntries={['/appointments']}>
        <WorkspaceLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('img', { name: 'Tá Marcado' })).toHaveAttribute(
      'src',
      '/pwa-icon.svg',
    );
    expect(screen.getByRole('link', { name: 'Tá Marcado' })).toHaveAttribute(
      'href',
      '/appointments',
    );
  });
});
