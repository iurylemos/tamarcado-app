import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { BusinessSegment } from '../../../shared/domain/interfaces/tenant.interface';
import type {
  CommissionType,
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
  ProductImageGallery,
} from '../../../shared/domain/interfaces/product.interface';
import { normalizeBrazilianPhone } from '../../../shared/domain/phone';
import { collections } from '../config/collections';
import type { BlockedPeriodDocument, WorkingHoursDocument } from '../model/availability.model';
import type { ProductDocument } from '../model/product.model';
import {
  productGalleryCombinationKey,
  productGalleryDocumentId,
  type ProductGalleryDocument,
} from '../model/product-gallery.model';
import type {
  ProfessionalDocument,
  ProfessionalProductDocument,
} from '../model/professional.model';
import type { TenantDocument } from '../model/tenant.model';
import { getCollaboratorEmails } from './collaborator-account.service';
import { firestore, professionalProductId } from './firestore.service';

type Input = Record<string, unknown>;

const businessSegments = new Set<BusinessSegment>([
  'beauty',
  'health',
  'fitness',
  'automotive',
  'other',
]);

function inputObject(value: unknown): Input {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'Informe os dados para salvar.');
  }
  return value as Input;
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpsError(
      'invalid-argument',
      `${label} é obrigatório e deve ter até ${maxLength} caracteres.`,
    );
  }
  return value.trim();
}

function optionalText(value: unknown, label: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpsError('invalid-argument', `${label} deve ter até ${maxLength} caracteres.`);
  }
  return value.trim() || undefined;
}

function validUrl(value: string, label: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('scheme');
  } catch {
    throw new HttpsError('invalid-argument', `${label} deve ser um endereço HTTP ou HTTPS válido.`);
  }
  return value;
}

function optionalUrl(value: unknown, label: string): string | undefined {
  const text = optionalText(value, label, 2048);
  return text ? validUrl(text, label) : undefined;
}

function requiredInteger(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpsError(
      'invalid-argument',
      `${label} deve ser um número inteiro entre ${min} e ${max}.`,
    );
  }
  return value;
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new HttpsError('invalid-argument', `${label} inválido.`);
  return value;
}

function optionalDocumentId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 150 || value.includes('/')) {
    throw new HttpsError('invalid-argument', 'Identificador inválido.');
  }
  return value;
}

function documentData<T>(snapshot: FirebaseFirestore.DocumentSnapshot): T | undefined {
  return snapshot.exists ? (snapshot.data() as T) : undefined;
}

export interface ProductInput {
  id?: string;
  name: string;
  description?: string;
  imageUrl: string;
  customizationAttributes?: ProductCustomizationAttribute[];
  defaultImages?: ProductImage[];
  priceCents: number;
  durationMinutes: number;
  commissionType: CommissionType;
  commissionValue: number;
  active: boolean;
}

function stableIdentifier(value: unknown, label: string): string {
  const identifier = requiredText(value, label, 100);
  if (!/^[A-Za-z0-9_-]+$/.test(identifier)) {
    throw new HttpsError('invalid-argument', `${label} inválido.`);
  }
  return identifier;
}

function validateCustomizationAttributes(value: unknown): ProductCustomizationAttribute[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'As opções de personalização são inválidas.');
  }

  const attributeIds = new Set<string>();
  return value.map((rawAttribute) => {
    const attribute = inputObject(rawAttribute);
    const id = stableIdentifier(attribute.id, 'Identificador do atributo');
    const label = requiredText(attribute.label, 'Nome do atributo', 80);
    if (attributeIds.has(id)) {
      throw new HttpsError('invalid-argument', 'Os identificadores dos atributos devem ser únicos.');
    }
    attributeIds.add(id);

    if (!Array.isArray(attribute.options) || attribute.options.length < 2) {
      throw new HttpsError(
        'invalid-argument',
        'Cada atributo deve ter pelo menos duas opções.',
      );
    }

    const optionIds = new Set<string>();
    const optionLabels = new Set<string>();
    const options = attribute.options.map((rawOption) => {
      const option = inputObject(rawOption);
      const optionId = stableIdentifier(option.id, 'Identificador da opção');
      const optionLabel = requiredText(option.label, 'Nome da opção', 80);
      const normalizedLabel = optionLabel.toLocaleLowerCase('pt-BR');
      if (optionIds.has(optionId) || optionLabels.has(normalizedLabel)) {
        throw new HttpsError(
          'invalid-argument',
          'As opções de cada atributo devem ter identificadores e nomes únicos.',
        );
      }
      optionIds.add(optionId);
      optionLabels.add(normalizedLabel);
      return { id: optionId, label: optionLabel };
    });
    const defaultOptionId = stableIdentifier(
      attribute.defaultOptionId,
      'Opção padrão',
    );
    if (!optionIds.has(defaultOptionId)) {
      throw new HttpsError(
        'invalid-argument',
        'A opção padrão deve pertencer ao atributo.',
      );
    }
    return { id, label, options, defaultOptionId };
  });
}

function validateProductImages(value: unknown): ProductImage[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new HttpsError(
      'invalid-argument',
      'A galeria padrão deve conter de uma a dez imagens.',
    );
  }
  const ids = new Set<string>();
  return value.map((rawImage) => {
    const image = inputObject(rawImage);
    const id = stableIdentifier(image.id, 'Identificador da imagem');
    if (ids.has(id)) {
      throw new HttpsError('invalid-argument', 'Os identificadores das imagens devem ser únicos.');
    }
    ids.add(id);
    const storagePath =
      image.id === 'legacy-image' && image.storagePath === ''
        ? ''
        : requiredText(image.storagePath, 'Caminho da imagem', 1024);
    if (
      storagePath.startsWith('/') ||
      storagePath.split('/').some((part) => part === '.' || part === '..')
    ) {
      throw new HttpsError('invalid-argument', 'O caminho da imagem é inválido.');
    }
    const downloadUrl = validUrl(
      requiredText(image.downloadUrl, 'Endereço da imagem', 2048),
      'Endereço da imagem',
    );
    return { id, storagePath, downloadUrl };
  });
}

export function validateProductInput(rawInput: unknown): ProductInput {
  const input = inputObject(rawInput);
  const id = optionalDocumentId(input.id);
  const name = requiredText(input.name, 'Nome do serviço', 80);
  const description = optionalText(input.description, 'Descrição', 600);
  const customizationAttributes = validateCustomizationAttributes(input.customizationAttributes);
  const defaultImages = validateProductImages(input.defaultImages);
  const imageUrl = defaultImages
    ? defaultImages[0]!.downloadUrl
    : validUrl(requiredText(input.imageUrl, 'Imagem', 2048), 'Imagem');
  const priceCents = requiredInteger(
    input.priceCents,
    'Preço em centavos',
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const durationMinutes = requiredInteger(
    input.durationMinutes,
    'Duração',
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const commissionType = input.commissionType;
  if (commissionType !== 'percentage' && commissionType !== 'fixed') {
    throw new HttpsError('invalid-argument', 'Escolha uma forma de comissão válida.');
  }
  const commissionValue = requiredInteger(
    input.commissionValue,
    commissionType === 'percentage' ? 'Comissão em pontos-base' : 'Comissão em centavos',
    0,
    commissionType === 'percentage' ? 10_000 : Number.MAX_SAFE_INTEGER,
  );
  const active = requiredBoolean(input.active, 'Status');
  return {
    ...(id ? { id } : {}),
    name,
    ...(description ? { description } : {}),
    imageUrl,
    ...(customizationAttributes !== undefined ? { customizationAttributes } : {}),
    ...(defaultImages !== undefined ? { defaultImages } : {}),
    priceCents,
    durationMinutes,
    commissionType,
    commissionValue,
    active,
  };
}

export interface BackofficeWorkspace {
  company: Pick<
    TenantDocument,
    | 'name'
    | 'slug'
    | 'segment'
    | 'description'
    | 'phoneE164'
    | 'logoUrl'
    | 'emailDomain'
    | 'timezone'
    | 'bookingIntervalMinutes'
    | 'active'
  > & { id: string };
  collaboratorEmails: Record<string, string>;
  products: Array<ProductDocument & { id: string; imageGalleries?: ProductImageGallery[] }>;
  productGalleries: ProductGalleryDocument[];
  professionals: Array<ProfessionalDocument & { id: string }>;
  assignments: Array<ProfessionalProductDocument & { id: string }>;
  workingHours: Array<WorkingHoursDocument & { id: string }>;
  blockedPeriods: Array<
    Omit<BlockedPeriodDocument, 'startsAt' | 'endsAt' | 'createdAt'> & {
      id: string;
      startsAt: string;
      endsAt: string;
    }
  >;
}

export async function getBackofficeWorkspace(tenantId: string): Promise<BackofficeWorkspace> {
  const [
    companySnapshot,
    productsSnapshot,
    galleriesSnapshot,
    professionalsSnapshot,
    assignmentsSnapshot,
    hoursSnapshot,
    blocksSnapshot,
    collaboratorEmails,
  ] = await Promise.all([
    firestore.collection(collections.tenants).doc(tenantId).get(),
    firestore.collection(collections.products).where('tenantId', '==', tenantId).get(),
    firestore.collection(collections.productImageGalleries).where('tenantId', '==', tenantId).get(),
    firestore.collection(collections.professionals).where('tenantId', '==', tenantId).get(),
    firestore.collection(collections.professionalProducts).where('tenantId', '==', tenantId).get(),
    firestore.collection(collections.workingHours).where('tenantId', '==', tenantId).get(),
    firestore.collection(collections.blockedPeriods).where('tenantId', '==', tenantId).get(),
    getCollaboratorEmails(tenantId),
  ]);
  const company = documentData<TenantDocument>(companySnapshot);
  if (!company) throw new HttpsError('not-found', 'Empresa não encontrada.');

  const byName = <T extends { name: string }>(first: T, second: T) =>
    first.name.localeCompare(second.name, 'pt-BR');
  const productGalleries = galleriesSnapshot.docs.map(
    (doc) => ({ ...(doc.data() as ProductGalleryDocument), id: doc.id }),
  );
  const galleriesByProduct = new Map<string, ProductImageGallery[]>();
  for (const gallery of productGalleries) {
    const galleries = galleriesByProduct.get(gallery.productId) ?? [];
    galleries.push({
      id: gallery.id,
      productId: gallery.productId,
      combinationKey: gallery.combinationKey,
      selections: gallery.selections,
      images: gallery.images,
    });
    galleriesByProduct.set(gallery.productId, galleries);
  }
  return {
    company: {
      id: tenantId,
      name: company.name,
      slug: company.slug,
      segment: company.segment,
      timezone: company.timezone,
      bookingIntervalMinutes: company.bookingIntervalMinutes,
      active: company.active,
      ...(company.description ? { description: company.description } : {}),
      ...(company.phoneE164 ? { phoneE164: company.phoneE164 } : {}),
      ...(company.logoUrl ? { logoUrl: company.logoUrl } : {}),
      ...(company.emailDomain ? { emailDomain: company.emailDomain } : {}),
    },
    collaboratorEmails,
    products: productsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as ProductDocument),
        ...(galleriesByProduct.has(doc.id)
          ? { imageGalleries: galleriesByProduct.get(doc.id)! }
          : {}),
      }))
      .sort(byName),
    productGalleries,
    professionals: professionalsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as ProfessionalDocument) }))
      .sort(byName),
    assignments: assignmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ProfessionalProductDocument),
    })),
    workingHours: hoursSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as WorkingHoursDocument),
    })),
    blockedPeriods: blocksSnapshot.docs.map((doc) => {
      const block = doc.data() as BlockedPeriodDocument;
      return {
        id: doc.id,
        tenantId: block.tenantId,
        createdBy: block.createdBy,
        startsAt: block.startsAt.toDate().toISOString(),
        endsAt: block.endsAt.toDate().toISOString(),
        ...(block.professionalId ? { professionalId: block.professionalId } : {}),
        ...(block.reason ? { reason: block.reason } : {}),
      };
    }),
  };
}

export async function saveProduct(tenantId: string, rawInput: unknown): Promise<{ id: string }> {
  const raw = inputObject(rawInput);
  const {
    id,
    name,
    description,
    imageUrl,
    customizationAttributes,
    defaultImages,
    priceCents,
    durationMinutes,
    commissionType,
    commissionValue,
    active,
  } = validateProductInput(raw);
  const reference = id
    ? firestore.collection(collections.products).doc(id)
    : firestore.collection(collections.products).doc();
  const projection = firestore.collection(collections.publicProducts).doc(reference.id);

  await firestore.runTransaction(async (transaction) => {
    const [tenantSnapshot, currentSnapshot] = await Promise.all([
      transaction.get(firestore.collection(collections.tenants).doc(tenantId)),
      transaction.get(reference),
    ]);
    const tenant = documentData<TenantDocument>(tenantSnapshot);
    const current = documentData<ProductDocument>(currentSnapshot);
    if (!tenant) throw new HttpsError('not-found', 'Empresa não encontrada.');
    if (id && current?.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Serviço não encontrado nesta empresa.');
    }
    if (defaultImages) validateImageOwnership(defaultImages, tenantId, reference.id);
    const primaryImageUrl = defaultImages?.[0]?.downloadUrl ?? current?.defaultImages?.[0]?.downloadUrl ?? imageUrl;

    const product: ProductDocument = {
      tenantId,
      name,
      description: description ?? '',
      imageUrl: primaryImageUrl,
      ...(customizationAttributes !== undefined
        ? { customizationAttributes }
        : current?.customizationAttributes
          ? { customizationAttributes: current.customizationAttributes }
          : {}),
      ...(defaultImages !== undefined
        ? { defaultImages }
        : current?.defaultImages
          ? { defaultImages: current.defaultImages }
          : {}),
      priceCents,
      durationMinutes,
      commissionType,
      commissionValue,
      active,
    };
    transaction.set(
      reference,
      {
        ...product,
        ...(!current ? { createdAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      projection,
      {
        tenantId,
        businessSlug: tenant.slug,
        name,
        description: description ?? '',
        imageUrl: primaryImageUrl,
        ...(customizationAttributes !== undefined
          ? { customizationAttributes }
          : current?.customizationAttributes
            ? { customizationAttributes: current.customizationAttributes }
            : {}),
        ...(defaultImages !== undefined
          ? { defaultImages }
          : current?.defaultImages
            ? { defaultImages: current.defaultImages }
            : {}),
        priceCents,
        durationMinutes,
        active,
        published: true,
      },
      { merge: true },
    );
  });
  return { id: reference.id };
}

function validateImageOwnership(images: ProductImage[], tenantId: string, productId: string): void {
  const requiredPrefix = `product-images/${tenantId}/${productId}/`;
  if (
    images.some(
      ({ storagePath }) =>
        storagePath !== '' &&
        (!storagePath.startsWith(requiredPrefix) || storagePath.length === requiredPrefix.length),
    )
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Cada imagem deve pertencer à galeria deste produto e desta empresa.',
    );
  }
}

function validateGallerySelections(
  rawSelections: unknown,
  attributes: ProductCustomizationAttribute[] | undefined,
): ProductCustomizationSelection[] {
  if (!Array.isArray(rawSelections) || !attributes?.length || rawSelections.length !== attributes.length) {
    throw new HttpsError(
      'invalid-argument',
      'A galeria deve selecionar exatamente uma opção para cada atributo do serviço.',
    );
  }
  const byAttribute = new Map<string, string>();
  for (const rawSelection of rawSelections) {
    const selection = inputObject(rawSelection);
    const attributeId = stableIdentifier(selection.attributeId, 'Identificador do atributo');
    const optionId = stableIdentifier(selection.optionId, 'Identificador da opção');
    if (byAttribute.has(attributeId)) {
      throw new HttpsError('invalid-argument', 'A seleção de atributos não pode conter duplicatas.');
    }
    byAttribute.set(attributeId, optionId);
  }
  return attributes.map((attribute) => {
    const optionId = byAttribute.get(attribute.id);
    if (!optionId || !attribute.options.some((option) => option.id === optionId)) {
      throw new HttpsError(
        'invalid-argument',
        'A galeria contém uma opção inválida para este serviço.',
      );
    }
    return { attributeId: attribute.id, optionId };
  });
}

function validateGalleryImages(
  value: unknown,
  tenantId: string,
  productId: string,
): ProductImage[] {
  const images = validateProductImages(value);
  if (!images) {
    throw new HttpsError('invalid-argument', 'Informe as imagens da galeria.');
  }
  if (images.some(({ storagePath }) => !storagePath)) {
    throw new HttpsError('invalid-argument', 'Galerias de variação exigem imagens no Storage.');
  }
  validateImageOwnership(images, tenantId, productId);
  return images;
}

export async function saveProductGallery(
  tenantId: string,
  rawInput: unknown,
): Promise<{ id: string; combinationKey: string }> {
  const input = inputObject(rawInput);
  const productId = requiredText(input.productId, 'Serviço', 150);
  if (productId.includes('/')) throw new HttpsError('invalid-argument', 'Serviço inválido.');
  const reference = firestore.collection(collections.products).doc(productId);
  let savedId = '';
  let savedCombinationKey = '';

  await firestore.runTransaction(async (transaction) => {
    const productSnapshot = await transaction.get(reference);
    const product = documentData<ProductDocument>(productSnapshot);
    if (!product || product.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Serviço não encontrado nesta empresa.');
    }
    const selections = validateGallerySelections(input.selections, product.customizationAttributes);
    const images = validateGalleryImages(input.images, tenantId, productId);
    const combinationKey = productGalleryCombinationKey(selections);
    const id = productGalleryDocumentId(productId, combinationKey);
    const galleryReference = firestore.collection(collections.productImageGalleries).doc(id);
    const publicReference = firestore.collection(collections.publicProductGalleries).doc(id);
    const gallery: ProductGalleryDocument = {
      id,
      productId,
      combinationKey,
      selections,
      images,
      tenantId,
      businessSlug: (await transaction.get(
        firestore.collection(collections.tenants).doc(tenantId),
      )).data()?.slug as string,
      published: true,
    };
    if (!gallery.businessSlug) {
      throw new HttpsError('not-found', 'Empresa não encontrada.');
    }
    transaction.set(galleryReference, {
      ...gallery,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(publicReference, {
      id,
      productId,
      combinationKey,
      selections,
      images,
      tenantId,
      businessSlug: gallery.businessSlug,
      published: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    savedId = id;
    savedCombinationKey = combinationKey;
  });
  return { id: savedId, combinationKey: savedCombinationKey };
}

export async function deleteProductGallery(
  tenantId: string,
  rawInput: unknown,
): Promise<{ deleted: true; storagePaths: string[] }> {
  const input = inputObject(rawInput);
  const productId = requiredText(input.productId, 'Serviço', 150);
  const galleryId = requiredText(input.galleryId, 'Galeria', 150);
  if (productId.includes('/')) throw new HttpsError('invalid-argument', 'Serviço inválido.');
  const reference = firestore.collection(collections.products).doc(productId);
  let storagePaths: string[] = [];

  await firestore.runTransaction(async (transaction) => {
    const productSnapshot = await transaction.get(reference);
    const product = documentData<ProductDocument>(productSnapshot);
    if (!product || product.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Serviço não encontrado nesta empresa.');
    }
    const galleryReference = firestore.collection(collections.productImageGalleries).doc(galleryId);
    const publicReference = firestore.collection(collections.publicProductGalleries).doc(galleryId);
    const gallerySnapshot = await transaction.get(galleryReference);
    const gallery = documentData<ProductGalleryDocument>(gallerySnapshot);
    if (!gallery || gallery.tenantId !== tenantId || gallery.productId !== productId) {
      throw new HttpsError('not-found', 'Galeria não encontrada neste serviço.');
    }
    storagePaths = gallery.images.map((image) => image.storagePath);
    transaction.delete(galleryReference);
    transaction.delete(publicReference);
  });
  return { deleted: true, storagePaths };
}

export async function saveProfessional(
  tenantId: string,
  rawInput: unknown,
): Promise<{ id: string }> {
  const input = inputObject(rawInput);
  const id = optionalDocumentId(input.id);
  const name = requiredText(input.name, 'Nome', 100);
  const normalizedPhone =
    typeof input.phone === 'string' ? normalizeBrazilianPhone(input.phone) : null;
  if (!normalizedPhone)
    throw new HttpsError('invalid-argument', 'Informe um telefone brasileiro válido com DDD.');
  const photoUrl = optionalUrl(input.photoUrl, 'Foto');
  const active = requiredBoolean(input.active, 'Status');
  if (
    !Array.isArray(input.productIds) ||
    input.productIds.some((value) => typeof value !== 'string')
  ) {
    throw new HttpsError('invalid-argument', 'Selecione os serviços associados.');
  }
  const productIds = [...new Set(input.productIds as string[])];
  if (productIds.length > 100)
    throw new HttpsError('invalid-argument', 'Selecione até 100 serviços.');
  const reference = id
    ? firestore.collection(collections.professionals).doc(id)
    : firestore.collection(collections.professionals).doc();

  await firestore.runTransaction(async (transaction) => {
    const existingAssignments = firestore
      .collection(collections.professionalProducts)
      .where('tenantId', '==', tenantId)
      .where('professionalId', '==', reference.id);
    const [currentSnapshot, assignmentSnapshot, ...products] = await Promise.all([
      transaction.get(reference),
      transaction.get(existingAssignments),
      ...productIds.map((productId) =>
        transaction.get(firestore.collection(collections.products).doc(productId)),
      ),
    ]);
    const current = documentData<ProfessionalDocument>(currentSnapshot);
    if (id && current?.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Colaborador não encontrado nesta empresa.');
    }
    if (
      products.some((snapshot) => {
        const product = documentData<ProductDocument>(snapshot);
        return !product || product.tenantId !== tenantId;
      })
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Todos os serviços devem pertencer a esta empresa.',
      );
    }

    const professional: ProfessionalDocument = {
      tenantId,
      name,
      phoneE164: normalizedPhone,
      ...(photoUrl ? { photoUrl } : {}),
      active,
    };
    transaction.set(
      reference,
      {
        ...professional,
        ...(!photoUrl ? { photoUrl: FieldValue.delete() } : {}),
        ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const selectedIds = new Set(productIds);
    const existingProductIds = new Set<string>();
    for (const assignment of assignmentSnapshot.docs) {
      const data = assignment.data() as ProfessionalProductDocument;
      existingProductIds.add(data.productId);
      transaction.set(assignment.ref, { ...data, active: selectedIds.has(data.productId) });
    }
    for (const productId of productIds) {
      if (existingProductIds.has(productId)) continue;
      const assignmentId = professionalProductId(tenantId, reference.id, productId);
      transaction.set(firestore.collection(collections.professionalProducts).doc(assignmentId), {
        tenantId,
        professionalId: reference.id,
        productId,
        active: true,
      });
    }
  });
  return { id: reference.id };
}

export async function saveWorkingHours(
  tenantId: string,
  rawInput: unknown,
): Promise<{ id: string }> {
  const input = inputObject(rawInput);
  const id = optionalDocumentId(input.id);
  const professionalId = requiredText(input.professionalId, 'Colaborador', 150);
  const dayOfWeek = requiredInteger(input.dayOfWeek, 'Dia da semana', 1, 7);
  const startLocalTime = requiredText(input.startLocalTime, 'Horário inicial', 5);
  const endLocalTime = requiredText(input.endLocalTime, 'Horário final', 5);
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(startLocalTime) || !timePattern.test(endLocalTime)) {
    throw new HttpsError('invalid-argument', 'Use horários no formato HH:mm.');
  }
  if (startLocalTime >= endLocalTime) {
    throw new HttpsError(
      'invalid-argument',
      'O horário inicial deve ser anterior ao horário final.',
    );
  }
  const active = requiredBoolean(input.active, 'Status');
  const reference = id
    ? firestore.collection(collections.workingHours).doc(id)
    : firestore.collection(collections.workingHours).doc();

  await firestore.runTransaction(async (transaction) => {
    const hoursQuery = firestore
      .collection(collections.workingHours)
      .where('tenantId', '==', tenantId)
      .where('professionalId', '==', professionalId)
      .where('dayOfWeek', '==', dayOfWeek)
      .where('active', '==', true);
    const [professionalSnapshot, currentSnapshot, hoursSnapshot] = await Promise.all([
      transaction.get(firestore.collection(collections.professionals).doc(professionalId)),
      transaction.get(reference),
      transaction.get(hoursQuery),
    ]);
    const professional = documentData<ProfessionalDocument>(professionalSnapshot);
    const current = documentData<WorkingHoursDocument>(currentSnapshot);
    if (!professional || professional.tenantId !== tenantId) {
      throw new HttpsError('failed-precondition', 'O colaborador deve pertencer a esta empresa.');
    }
    if (id && current?.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Horário não encontrado nesta empresa.');
    }
    if (active) {
      const overlaps = hoursSnapshot.docs.some((doc) => {
        if (doc.id === id) return false;
        const hour = doc.data() as WorkingHoursDocument;
        return startLocalTime < hour.endLocalTime && endLocalTime > hour.startLocalTime;
      });
      if (overlaps) {
        throw new HttpsError(
          'already-exists',
          'Este horário sobrepõe outro intervalo ativo do colaborador.',
        );
      }
    }
    const hours: WorkingHoursDocument = {
      tenantId,
      professionalId,
      dayOfWeek,
      startLocalTime,
      endLocalTime,
      active,
    };
    transaction.set(
      reference,
      {
        ...hours,
        ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  return { id: reference.id };
}

export async function saveBlockedPeriod(
  tenantId: string,
  actorUid: string,
  rawInput: unknown,
): Promise<{ id: string }> {
  const input = inputObject(rawInput);
  const id = optionalDocumentId(input.id);
  const professionalId = optionalText(input.professionalId, 'Colaborador', 150);
  const startsAtText = requiredText(input.startsAt, 'Início', 40);
  const endsAtText = requiredText(input.endsAt, 'Fim', 40);
  const startsAtDate = new Date(startsAtText);
  const endsAtDate = new Date(endsAtText);
  if (
    !startsAtText.endsWith('Z') ||
    !endsAtText.endsWith('Z') ||
    !Number.isFinite(startsAtDate.getTime()) ||
    !Number.isFinite(endsAtDate.getTime()) ||
    startsAtDate >= endsAtDate
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Informe um período UTC válido com início anterior ao fim.',
    );
  }
  const reason = optionalText(input.reason, 'Motivo', 160);
  const reference = id
    ? firestore.collection(collections.blockedPeriods).doc(id)
    : firestore.collection(collections.blockedPeriods).doc();

  await firestore.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(reference);
    const current = documentData<BlockedPeriodDocument>(currentSnapshot);
    if (id && current?.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Bloqueio não encontrado nesta empresa.');
    }
    if (professionalId) {
      const professionalSnapshot = await transaction.get(
        firestore.collection(collections.professionals).doc(professionalId),
      );
      const professional = documentData<ProfessionalDocument>(professionalSnapshot);
      if (!professional || professional.tenantId !== tenantId) {
        throw new HttpsError('failed-precondition', 'O colaborador deve pertencer a esta empresa.');
      }
    }
    const block: Omit<BlockedPeriodDocument, 'startsAt' | 'endsAt' | 'createdAt'> & {
      startsAt: Timestamp;
      endsAt: Timestamp;
      createdAt?: Timestamp;
    } = {
      tenantId,
      ...(professionalId ? { professionalId } : {}),
      startsAt: Timestamp.fromDate(startsAtDate),
      endsAt: Timestamp.fromDate(endsAtDate),
      ...(reason ? { reason } : {}),
      createdBy: current?.createdBy ?? actorUid,
      ...(current ? {} : { createdAt: Timestamp.now() }),
    };
    transaction.set(reference, block, { merge: true });
  });
  return { id: reference.id };
}

export async function deleteBlockedPeriod(tenantId: string, rawId: unknown): Promise<void> {
  const id = requiredText(rawId, 'Bloqueio', 150);
  if (id.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const reference = firestore.collection(collections.blockedPeriods).doc(id);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const block = documentData<BlockedPeriodDocument>(snapshot);
    if (!block || block.tenantId !== tenantId) {
      throw new HttpsError('not-found', 'Bloqueio não encontrado nesta empresa.');
    }
    transaction.delete(reference);
  });
}

export async function saveTenantSettings(tenantId: string, rawInput: unknown): Promise<void> {
  const input = inputObject(rawInput);
  const name = requiredText(input.name, 'Nome da empresa', 100);
  const slug = requiredText(input.slug, 'Endereço público', 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new HttpsError(
      'invalid-argument',
      'Use apenas letras minúsculas, números e hífens no endereço.',
    );
  }
  const segment = input.segment;
  if (typeof segment !== 'string' || !businessSegments.has(segment as BusinessSegment)) {
    throw new HttpsError('invalid-argument', 'Escolha um segmento válido.');
  }
  const description = optionalText(input.description, 'Descrição pública', 1000);
  const phoneText = optionalText(input.phone, 'Telefone', 30);
  const phoneE164 = phoneText ? normalizeBrazilianPhone(phoneText) : undefined;
  if (phoneText && !phoneE164) {
    throw new HttpsError('invalid-argument', 'Informe um telefone brasileiro válido com DDD.');
  }
  const logoUrl = optionalUrl(input.logoUrl, 'Logo');
  const emailDomain = optionalText(input.emailDomain, 'Domínio de e-mail', 100)?.toLowerCase().replace(/^@/, '');
  if (emailDomain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(emailDomain)) {
    throw new HttpsError('invalid-argument', 'Informe um domínio válido, como empresa.com.br.');
  }
  const timezone = requiredText(input.timezone, 'Fuso horário', 80);
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone });
  } catch {
    throw new HttpsError('invalid-argument', 'Informe um fuso horário IANA válido.');
  }
  const bookingIntervalMinutes = requiredInteger(
    input.bookingIntervalMinutes,
    'Intervalo de agendamento',
    5,
    120,
  );
  if (bookingIntervalMinutes % 5 !== 0) {
    throw new HttpsError(
      'invalid-argument',
      'O intervalo de agendamento deve ser múltiplo de 5 minutos.',
    );
  }
  const active = requiredBoolean(input.active, 'Status');
  const tenantRef = firestore.collection(collections.tenants).doc(tenantId);
  const publicRef = firestore.collection(collections.publicBusinesses).doc(tenantId);
  const tenantData: Record<string, unknown> = {
    name,
    slug,
    segment,
    description: description ?? FieldValue.delete(),
    phoneE164: phoneE164 ?? FieldValue.delete(),
    logoUrl: logoUrl ?? FieldValue.delete(),
    emailDomain: emailDomain ?? FieldValue.delete(),
    timezone,
    bookingIntervalMinutes,
    active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await firestore.runTransaction(async (transaction) => {
    const [currentSnapshot, matchingSlugs] = await Promise.all([
      transaction.get(tenantRef),
      transaction.get(firestore.collection(collections.tenants).where('slug', '==', slug)),
    ]);
    if (!currentSnapshot.exists) throw new HttpsError('not-found', 'Empresa não encontrada.');
    const duplicate = matchingSlugs.docs.find((doc) => doc.id !== tenantId);
    if (duplicate) throw new HttpsError('already-exists', 'Este endereço público já está em uso.');
    transaction.set(tenantRef, tenantData, { merge: true });
    transaction.set(
      publicRef,
      {
        tenantId,
        name,
        slug,
        segment,
        description: description ?? FieldValue.delete(),
        logoUrl: logoUrl ?? FieldValue.delete(),
        published: active,
      },
      { merge: true },
    );
  });
}
