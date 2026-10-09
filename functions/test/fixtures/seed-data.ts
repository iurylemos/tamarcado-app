import type {
  ProductCustomizationAttribute,
  ProductVariantPrice,
} from '../../../shared/domain/interfaces/product.interface';

export type SeedDocument = {
  collection: string;
  id: string;
  data: Record<string, unknown>;
};

const sofaAttributes: ProductCustomizationAttribute[] = [
  {
    id: 'fabric',
    label: 'Tecido',
    options: [
      { id: 'fabric-linen', label: 'Linho Areia' },
      { id: 'fabric-suede', label: 'Suede Grafite' },
      { id: 'fabric-velvet', label: 'Veludo Verde' },
    ],
    defaultOptionId: 'fabric-suede',
  },
  {
    id: 'seats',
    label: 'Lugares',
    options: [
      { id: 'seats-two', label: '2 lugares' },
      { id: 'seats-three', label: '3 lugares' },
      { id: 'seats-four', label: '4 lugares' },
    ],
    defaultOptionId: 'seats-three',
  },
];

const headboardAttributes: ProductCustomizationAttribute[] = [
  {
    id: 'fabric',
    label: 'Tecido',
    options: [
      { id: 'fabric-linen', label: 'Linho Natural' },
      { id: 'fabric-suede', label: 'Suede Marrom' },
      { id: 'fabric-velvet', label: 'Veludo Azul' },
    ],
    defaultOptionId: 'fabric-linen',
  },
  {
    id: 'size',
    label: 'Tamanho',
    options: [
      { id: 'size-double', label: 'Casal' },
      { id: 'size-queen', label: 'Queen' },
      { id: 'size-king', label: 'King' },
    ],
    defaultOptionId: 'size-queen',
  },
];

const beautyBrows = [
  { id: 'design', name: 'Design', priceCents: 2500 },
  { id: 'design-henna', name: 'Design + Henna', priceCents: 4000 },
  { id: 'design-tintura', name: 'Design + Tintura', priceCents: 5000 },
  { id: 'brow-lamination', name: 'Brow Lamination', priceCents: 8000 },
] as const;

const beautyLashes = [
  { id: 'lash-lifting', name: 'Lash Lifting', priceCents: 10000 },
  { id: 'volume-express', name: 'Volume Express', priceCents: 9000 },
  { id: 'volume-brasileiro', name: 'Volume Brasileiro', priceCents: 12000 },
  { id: 'volume-intermediario', name: 'Volume intermediário', priceCents: 12000 },
  { id: 'volume-ingles', name: 'Volume Inglês', priceCents: 14000 },
  { id: 'volume-fox', name: 'Volume Fox', priceCents: 14000 },
] as const;

const beautyMaintenance = [
  { id: 'volume-brasileiro', name: 'Volume Brasileiro', priceCents: 8500 },
  { id: 'volume-intermediario', name: 'Volume intermediário', priceCents: 8500 },
  { id: 'volume-ingles', name: 'Volume Inglês', priceCents: 9500 },
  { id: 'volume-fox', name: 'Volume Fox', priceCents: 10000 },
] as const;

const beautyComboLashes = beautyLashes.filter((lash) => lash.id !== 'lash-lifting');
const beautyProductImageUrl =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85';

type BeautyProductSeed = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  customizationAttributes: ProductCustomizationAttribute[];
  variantPrices: ProductVariantPrice[];
};

const beautyProducts: BeautyProductSeed[] = [
  {
    id: 'service-vitoria-brows',
    name: 'Sobrancelhas',
    priceCents: beautyBrows[0].priceCents,
    durationMinutes: 60,
    customizationAttributes: [
      {
        id: 'brow-service',
        label: 'Procedimento',
        options: beautyBrows.map(({ id, name }) => ({ id, label: name })),
        defaultOptionId: beautyBrows[0].id,
      },
    ],
    variantPrices: beautyBrows.map(({ id, priceCents }) => ({
      selections: [{ attributeId: 'brow-service', optionId: id }],
      priceCents,
    })),
  },
  {
    id: 'service-vitoria-lashes',
    name: 'Cílios',
    priceCents: beautyLashes[0].priceCents,
    durationMinutes: 120,
    customizationAttributes: [
      {
        id: 'lash-service',
        label: 'Procedimento',
        options: beautyLashes.map(({ id, name }) => ({ id, label: name })),
        defaultOptionId: beautyLashes[0].id,
      },
    ],
    variantPrices: beautyLashes.map(({ id, priceCents }) => ({
      selections: [{ attributeId: 'lash-service', optionId: id }],
      priceCents,
    })),
  },
  {
    id: 'service-vitoria-maintenance',
    name: 'Manutenção',
    priceCents: beautyMaintenance[0].priceCents,
    durationMinutes: 60,
    customizationAttributes: [
      {
        id: 'maintenance-service',
        label: 'Procedimento',
        options: beautyMaintenance.map(({ id, name }) => ({ id, label: name })),
        defaultOptionId: beautyMaintenance[0].id,
      },
    ],
    variantPrices: beautyMaintenance.map(({ id, priceCents }) => ({
      selections: [{ attributeId: 'maintenance-service', optionId: id }],
      priceCents,
    })),
  },
  {
    id: 'service-vitoria-combo',
    name: 'Cílios + Sobrancelhas',
    priceCents: beautyBrows[0].priceCents + beautyComboLashes[0]!.priceCents,
    durationMinutes: 180,
    customizationAttributes: [
      {
        id: 'brow-service',
        label: 'Sobrancelhas',
        options: beautyBrows.map(({ id, name }) => ({ id, label: name })),
        defaultOptionId: beautyBrows[0].id,
      },
      {
        id: 'lash-service',
        label: 'Cílios',
        options: beautyComboLashes.map(({ id, name }) => ({ id, label: name })),
        defaultOptionId: beautyComboLashes[0]!.id,
      },
    ],
    variantPrices: beautyBrows.flatMap((brow) =>
      beautyComboLashes.map((lash) => ({
        selections: [
          { attributeId: 'brow-service', optionId: brow.id },
          { attributeId: 'lash-service', optionId: lash.id },
        ],
        priceCents: brow.priceCents + lash.priceCents,
      })),
    ),
  },
];

const retiredBeautyProductIds = [
  ...beautyBrows.map((service) => `service-vitoria-brow-${service.id}`),
  ...beautyLashes.map((service) => `service-vitoria-lash-${service.id}`),
  ...beautyMaintenance.map((service) => `service-vitoria-maintenance-${service.id}`),
  ...beautyBrows.flatMap((brow) =>
    beautyComboLashes.map((lash) => `service-vitoria-combo-${brow.id}-${lash.id}`),
  ),
];

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
        logoUrl:
          'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=640&q=80',
        emailDomain: 'aurora.test',
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
    {
      id: 'tenant-casa-nativa',
      data: {
        name: 'Casa Nativa Móveis',
        slug: 'casa-nativa-moveis',
        segment: 'home',
        description: 'Sofás e cabeceiras feitos para deixar a casa com a sua cara.',
        logoUrl:
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=640&q=80',
        emailDomain: 'casanativa.test',
        timezone: 'America/Sao_Paulo',
        bookingIntervalMinutes: 30,
        active: true,
      },
    },
    {
      id: 'tenant-vitoria-moura-beauty',
      data: {
        name: 'Vitória Moura Beauty',
        slug: 'vitoria-moura-beauty',
        segment: 'beauty',
        description: 'Brilhe através do Seu olhar',
        logoUrl:
          'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=640&q=80',
        emailDomain: 'vitoriamourabeauty.test',
        timezone: 'America/Sao_Paulo',
        bookingIntervalMinutes: 15,
        active: true,
      },
    },
  ];
  const professionals = [
    {
      id: 'professional-ana',
      tenantId: 'tenant-aurora',
      name: 'Ana Souza',
      active: true,
      phoneE164: '+5511999990001',
      photoUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'professional-bruna',
      tenantId: 'tenant-aurora',
      name: 'Bruna Lima',
      active: true,
      phoneE164: '+5511999990002',
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'professional-inactive',
      tenantId: 'tenant-aurora',
      name: 'Carol Dias',
      active: false,
      phoneE164: '+5511999990003',
      photoUrl:
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'professional-horizonte',
      tenantId: 'tenant-horizonte',
      name: 'Dra. Marina Reis',
      active: true,
      phoneE164: '+5521999990004',
      photoUrl:
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'professional-casa-nativa',
      tenantId: 'tenant-casa-nativa',
      name: 'Rafael Costa',
      active: true,
      phoneE164: '+5511999990005',
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'professional-vitoria-moura',
      tenantId: 'tenant-vitoria-moura-beauty',
      name: 'Vitória Moura',
      active: true,
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
  ];
  const seededBeautyProducts = beautyProducts.map((service) => ({
    ...service,
    tenantId: 'tenant-vitoria-moura-beauty',
    imageUrl: beautyProductImageUrl,
    commissionType: 'percentage' as const,
    commissionValue: 3500,
    active: true,
  }));
  const products = [
    {
      id: 'service-corte',
      tenantId: 'tenant-aurora',
      name: 'Corte e finalização',
      description: 'Corte personalizado com finalização.',
      imageUrl:
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85',
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
      imageUrl:
        'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=85',
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
      imageUrl:
        'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=85',
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
      imageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85',
      priceCents: 18000,
      durationMinutes: 45,
      commissionType: 'fixed',
      commissionValue: 5000,
      active: true,
    },
    {
      id: 'product-sofa-modular',
      tenantId: 'tenant-casa-nativa',
      name: 'Sofá modular Nativa',
      description: 'Sofá sob medida com escolha de tecido e quantidade de lugares.',
      imageUrl:
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85',
      customizationAttributes: sofaAttributes,
      priceCents: 389900,
      durationMinutes: 30,
      commissionType: 'percentage',
      commissionValue: 5000,
      active: true,
    },
    {
      id: 'product-headboard-upholstered',
      tenantId: 'tenant-casa-nativa',
      name: 'Cabeceira estofada Nativa',
      description: 'Cabeceira estofada disponível em diferentes tecidos e tamanhos.',
      imageUrl:
        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85',
      customizationAttributes: headboardAttributes,
      priceCents: 149900,
      durationMinutes: 30,
      commissionType: 'percentage',
      commissionValue: 5000,
      active: true,
    },
    ...seededBeautyProducts,
  ];
  const documents: SeedDocument[] = [];

  for (const tenant of tenants) {
    documents.push({
      collection: 'tenants',
      id: tenant.id,
      data: { ...tenant.data, active: true },
    });
    documents.push({
      collection: 'public_businesses',
      id: tenant.id,
      data: {
        tenantId: tenant.id,
        name: tenant.data.name,
        slug: tenant.data.slug,
        segment: tenant.data.segment,
        ...(tenant.data.description ? { description: tenant.data.description } : {}),
        ...('logoUrl' in tenant.data && tenant.data.logoUrl
          ? { logoUrl: tenant.data.logoUrl }
          : {}),
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
        ...('description' in product && product.description
          ? { description: product.description }
          : {}),
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        durationMinutes: product.durationMinutes,
        active: product.active,
        ...('customizationAttributes' in product
          ? { customizationAttributes: product.customizationAttributes }
          : {}),
        ...('variantPrices' in product ? { variantPrices: product.variantPrices } : {}),
        published: true,
      },
    });
  }
  for (const productId of retiredBeautyProductIds) {
    documents.push(
      {
        collection: 'products',
        id: productId,
        data: { tenantId: 'tenant-vitoria-moura-beauty', active: false },
      },
      {
        collection: 'public_products',
        id: productId,
        data: {
          tenantId: 'tenant-vitoria-moura-beauty',
          active: false,
          published: false,
        },
      },
      {
        collection: 'professional_products',
        id: ['tenant-vitoria-moura-beauty', 'professional-vitoria-moura', productId].join('__'),
        data: {
          tenantId: 'tenant-vitoria-moura-beauty',
          professionalId: 'professional-vitoria-moura',
          productId,
          active: false,
        },
      },
    );
  }

  const assignments = [
    ['tenant-aurora', 'professional-ana', 'service-corte', true],
    ['tenant-aurora', 'professional-bruna', 'service-corte', true],
    ['tenant-aurora', 'professional-ana', 'service-coloracao', true],
    ['tenant-aurora', 'professional-inactive', 'service-corte', true],
    ['tenant-horizonte', 'professional-horizonte', 'service-consulta', true],
    ['tenant-casa-nativa', 'professional-casa-nativa', 'product-sofa-modular', true],
    ['tenant-casa-nativa', 'professional-casa-nativa', 'product-headboard-upholstered', true],
    ...seededBeautyProducts.map(
      (product) =>
        ['tenant-vitoria-moura-beauty', 'professional-vitoria-moura', product.id, true] as const,
    ),
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
    ['tenant-casa-nativa', 'professional-casa-nativa'],
    ['tenant-vitoria-moura-beauty', 'professional-vitoria-moura'],
  ] as const;
  for (const [tenantId, professionalId] of hours) {
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek += 1) {
      documents.push({
        collection: 'working_hours',
        id: `${tenantId}__${professionalId}__${dayOfWeek}`,
        data: {
          tenantId,
          professionalId,
          dayOfWeek,
          startLocalTime: '09:00',
          endLocalTime: '18:00',
          active: true,
        },
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
        productImageUrlSnapshot:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85',
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
    {
      collection: 'users',
      id: 'test-backoffice-aurora',
      data: {
        tenantId: 'tenant-aurora',
        role: 'backoffice',
        name: 'Gestor de teste',
        phoneE164: '+5511999990010',
        email: 'admin@aurora.test',
        active: true,
      },
    },
    {
      collection: 'users',
      id: 'test-collaborator-ana',
      data: {
        tenantId: 'tenant-aurora',
        role: 'collaborator',
        professionalId: 'professional-ana',
        name: 'Ana Souza',
        phoneE164: '+5511999990001',
        email: 'ana@aurora.test',
        active: true,
      },
    },
    {
      collection: 'users',
      id: 'test-backoffice-horizonte',
      data: {
        tenantId: 'tenant-horizonte',
        role: 'backoffice',
        name: 'Gestor Horizonte',
        phoneE164: '+5521999990010',
        active: true,
      },
    },
    {
      collection: 'users',
      id: 'test-backoffice-casa-nativa',
      data: {
        tenantId: 'tenant-casa-nativa',
        role: 'backoffice',
        name: 'Gestor Casa Nativa',
        phoneE164: '+5511999990011',
        email: 'admin@casanativa.test',
        active: true,
      },
    },
    {
      collection: 'users',
      id: 'test-collaborator-casa-nativa',
      data: {
        tenantId: 'tenant-casa-nativa',
        role: 'collaborator',
        professionalId: 'professional-casa-nativa',
        name: 'Rafael Costa',
        phoneE164: '+5511999990005',
        email: 'rafael@casanativa.test',
        active: true,
      },
    },
    {
      collection: 'connections',
      id: 'connection-aurora',
      data: { tenantId: 'tenant-aurora', provider: 'emulator-test-double', status: 'active' },
    },
    {
      collection: 'contacts',
      id: 'contact-aurora-demo',
      data: {
        tenantId: 'tenant-aurora',
        connectionId: 'connection-aurora',
        phoneE164: '+5511999990009',
        name: 'Cliente de teste',
        whatsappOptIn: false,
      },
    },
    {
      collection: 'messages',
      id: 'message-aurora-demo',
      data: {
        tenantId: 'tenant-aurora',
        connectionId: 'connection-aurora',
        contactId: 'contact-aurora-demo',
        direction: 'outbound',
        content: 'Mensagem de demonstração',
        status: 'delivered',
      },
    },
  );
  return documents;
}

export const seedUsers = [
  {
    uid: 'test-backoffice-aurora',
    email: 'admin@aurora.test',
    tenantId: 'tenant-aurora',
    role: 'backoffice',
  },
  {
    uid: 'test-collaborator-ana',
    email: 'ana@aurora.test',
    tenantId: 'tenant-aurora',
    role: 'collaborator',
    professionalId: 'professional-ana',
  },
  {
    uid: 'test-backoffice-horizonte',
    email: 'admin@horizonte.test',
    tenantId: 'tenant-horizonte',
    role: 'backoffice',
  },
  {
    uid: 'test-backoffice-casa-nativa',
    email: 'admin@casanativa.test',
    tenantId: 'tenant-casa-nativa',
    role: 'backoffice',
  },
  {
    uid: 'test-collaborator-casa-nativa',
    email: 'rafael@casanativa.test',
    tenantId: 'tenant-casa-nativa',
    role: 'collaborator',
    professionalId: 'professional-casa-nativa',
  },
] as const;

export function seedUserClaims(user: (typeof seedUsers)[number]) {
  return {
    tenantId: user.tenantId,
    role: user.role,
    active: true,
    ...('professionalId' in user ? { professionalId: user.professionalId } : {}),
  };
}
