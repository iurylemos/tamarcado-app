import { describe, expect, it } from 'vitest';
import { saveProfessional } from '../../services/backoffice.service';

describe('professional administration validation', () => {
  it.each(['', '1199999000', '+5511000000000', 'not-a-phone'])(
    'rejects invalid or sensitive Brazilian phone input %s',
    async (phone) => {
      await expect(
        saveProfessional('tenant-aurora', {
          name: 'Pessoa de teste',
          phone,
          active: true,
          productIds: [],
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    },
  );

  it('rejects malformed product associations before writing', async () => {
    await expect(
      saveProfessional('tenant-aurora', {
        name: 'Pessoa de teste',
        phone: '(11) 99999-0001',
        active: true,
        productIds: ['service-corte', 7],
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
