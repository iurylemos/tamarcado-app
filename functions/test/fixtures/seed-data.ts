export type SeedDocument = {
  collection: string;
  id: string;
  data: Record<string, unknown>;
};

const fixedDate = (daysFromNow: number, hour = 10) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

export function createSeedDocuments(now = new Date()): SeedDocument[] {
  const historyDate = (daysAgo: number, hour: number) =>
    new Date(now.getTime() - daysAgo * 86_400_000 + (hour - now.getUTCHours()) * 3_600_000);
  const tenants = [
    {
      id: 'tenant-aurora',
      data: {
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
        description: 'Cuidado e beleza no seu ritmo.',
        logoUrl: 'https://images.example.test/studio-aurora.jpg',
        timezone: 'America/Sao_Paulo',
        bookingIntervalMinutes: 15,
        active: true,
      },
    },
    {
      id: 'tenant-horizonte',
      data: {
        name: 'Clínica Horizonte',
        slug: 'clinica-horizonte',
        segment: 'health',
        description: 'Atendimento próximo e acolhedor.',
        timezone: 'America/Sao_Paulo',
        bookingIntervalMinutes: 30,
        active: true,
      },
    },
  ];
  const professionals = [
    { id: 'professional-ana', tenantId: 'tenant-aurora', name: 'Ana Souza', active: true, phoneE164: '+5511999990001' },
    { id: 'professional-bruna', tenantId: 'tenant-aurora', name: 'Bruna Lima', active: true, phoneE164: '+5511999990002' },
    { id: 'professional-inactive', tenantId: 'tenant-aurora', name: 'Carol Dias', active: false, phoneE164: '+5511999990003' },
    { id: 'professional-horizonte', tenantId: 'tenant-horizonte', name: 'Dra. Marina Reis', active: true, phoneE164: '+5521999990004' },
  ];
  const products = [
    {
      id: 'service-corte',
      tenantId: 'tenant-aurora',
      name: 'Corte e finalização',
      description: 'Corte personalizado com finalização.',
      imageUrl: 'https://images.example.test/corte.jpg',
      priceCents: 12000,
      durationMinutes: 60,
      commissionType: 'percentage',
      commissionValue: 3500,
      active: true,
    },
    {
      id: 'service-hidratacao',
      tenantId: 'tenant-aurora',
      name: 'Hidratação profunda',
      description: 'Tratamento nutritivo para os fios.',
      imageUrl: 'https://images.example.test/hidratacao.jpg',
      priceCents: 9500,
      durationMinutes: 45,
      commissionType: 'fixed',
      commissionValue: 2500,
      active: false,
    },
    {
      id: 'service-coloracao',
      tenantId: 'tenant-aurora',
      name: 'Coloração',
      imageUrl: 'https://images.example.test/coloracao.jpg',
      priceCents: 25000,
      durationMinutes: 120,
      commissionType: 'percentage',
      commissionValue: 4000,
      active: true,
    },
    {
      id: 'service-consulta',
      tenantId: 'tenant-horizonte',
      name: 'Consulta inicial',
      description: 'Avaliação individual.',
      imageUrl: 'https://images.example.test/consulta.jpg',
      priceCents: 18000,
      durationMinutes: 45,
      commissionType: 'fixed',
      commissionValue: 5000,
      active: true,
    },
  ];
  const documents: SeedDocument[] = [];

  for (const tenant of tenants) {
    documents.push({ collection: 'tenants', id: tenant.id, data: { ...tenant.data, active: true } });
    documents.push({
      collection: 'public_businesses',
      id: tenant.id,
      data: {
        tenantId: tenant.id,
        name: tenant.data.name,
        slug: tenant.data.slug,
        segment: tenant.data.segment,
        description: tenant.data.description,
        logoUrl: tenant.data.logoUrl,
        published: true,
      },
    });
  }

  for (const professional of professionals) {
    documents.push({ collection: 'professionals', id: professional.id, data: professional });
  }
  for (const product of products) {
    documents.push({ collection: 'products', id: product.id, data: product });
    const tenant = tenants.find((item) => item.id === product.tenantId);
    if (!tenant) throw new Error(`Missing tenant for seed product ${product.id}.`);
    documents.push({
      collection: 'public_products',
      id: product.id,
      data: {
        tenantId: product.tenantId,
        businessSlug: tenant.data.slug,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        durationMinutes: product.durationMinutes,
        active: product.active,
        published: true,
      },
    });
  }

  const assignments = [
    ['tenant-aurora', 'professional-ana', 'service-corte', true],
    ['tenant-aurora', 'professional-bruna', 'service-corte', true],
    ['tenant-aurora', 'professional-ana', 'service-coloracao', true],
    ['tenant-aurora', 'professional-inactive', 'service-corte', true],
    ['tenant-horizonte', 'professional-horizonte', 'service-consulta', true],
  ] as const;
  for (const [tenantId, professionalId, productId, active] of assignments) {
    const id = [tenantId, professionalId, productId].join('__');
    documents.push({
      collection: 'professional_products',
      id,
      data: { tenantId, professionalId, productId, active },
    });
  }

  const hours = [
    ['tenant-aurora', 'professional-ana'],
    ['tenant-aurora', 'professional-bruna'],
    ['tenant-aurora', 'professional-inactive'],
    ['tenant-horizonte', 'professional-horizonte'],
  ] as const;
  for (const [tenantId, professionalId] of hours) {
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek += 1) {
      documents.push({
        collection: 'working_hours',
        id: `${tenantId}__${professionalId}__${dayOfWeek}`,
        data: { tenantId, professionalId, dayOfWeek, startLocalTime: '09:00', endLocalTime: '18:00', active: true },
      });
    }
  }

  documents.push({
    collection: 'blocked_periods',
    id: 'block-aurora-ana',
    data: {
      tenantId: 'tenant-aurora',
      professionalId: 'professional-ana',
      startsAt: (() => {
        const startsAt = fixedDate(3, 14);
        if (startsAt.getUTCDay() === 0) startsAt.setUTCDate(startsAt.getUTCDate() + 1);
        return startsAt;
      })(),
      endsAt: (() => {
        const startsAt = fixedDate(3, 14);
        if (startsAt.getUTCDay() === 0) startsAt.setUTCDate(startsAt.getUTCDate() + 1);
        startsAt.setUTCHours(15);
        return startsAt;
      })(),
      reason: 'Bloqueio de demonstração',
      createdBy: 'seed',
      createdAt: now,
    },
  });

  const historyStates = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
  historyStates.forEach((status, index) => {
    const startsAt = historyDate(index + 2, 10);
    documents.push({
      collection: 'appointments',
      id: `appointment-${status}`,
      data: {
        tenantId: 'tenant-aurora',
        customerPhoneE164: '+5511999990009',
        customerName: 'Cliente de teste',
        productId: 'service-corte',
        professionalId: index % 2 === 0 ? 'professional-ana' : 'professional-bruna',
        professionalNameSnapshot: index % 2 === 0 ? 'Ana Souza' : 'Bruna Lima',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        durationMinutes: 60,
        status,
        productNameSnapshot: 'Corte e finalização',
        productPriceCentsSnapshot: 12000,
        commissionTypeSnapshot: 'percentage',
        commissionValueSnapshot: 3500,
        commissionAmountCentsSnapshot: 4200,
        whatsappOptIn: false,
        createdBy: 'seed',
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  documents.push(
    { collection: 'users', id: 'test-backoffice-aurora', data: { tenantId: 'tenant-aurora', role: 'backoffice', name: 'Gestor de teste', phoneE164: '+5511999990010', active: true } },
    { collection: 'users', id: 'test-collaborator-ana', data: { tenantId: 'tenant-aurora', role: 'collaborator', professionalId: 'professional-ana', name: 'Ana Souza', phoneE164: '+5511999990001', active: true } },
    { collection: 'users', id: 'test-backoffice-horizonte', data: { tenantId: 'tenant-horizonte', role: 'backoffice', name: 'Gestor Horizonte', phoneE164: '+5521999990010', active: true } },
    { collection: 'connections', id: 'connection-aurora', data: { tenantId: 'tenant-aurora', provider: 'emulator-test-double', status: 'active' } },
    { collection: 'contacts', id: 'contact-aurora-demo', data: { tenantId: 'tenant-aurora', connectionId: 'connection-aurora', phoneE164: '+5511999990009', name: 'Cliente de teste', whatsappOptIn: false } },
    { collection: 'messages', id: 'message-aurora-demo', data: { tenantId: 'tenant-aurora', connectionId: 'connection-aurora', contactId: 'contact-aurora-demo', direction: 'outbound', content: 'Mensagem de demonstração', status: 'delivered' } },
  );
  return documents;
}

export const emulatorUsers = [
  { uid: 'test-backoffice-aurora', email: 'admin@aurora.test', password: 'EmulatorOnly123!', tenantId: 'tenant-aurora', role: 'backoffice' },
  { uid: 'test-collaborator-ana', email: 'ana@aurora.test', password: 'EmulatorOnly123!', tenantId: 'tenant-aurora', role: 'collaborator' },
  { uid: 'test-backoffice-horizonte', email: 'admin@horizonte.test', password: 'EmulatorOnly123!', tenantId: 'tenant-horizonte', role: 'backoffice' },
] as const;
