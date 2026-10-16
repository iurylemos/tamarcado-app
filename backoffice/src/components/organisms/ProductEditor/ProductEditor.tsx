import { useState, type JSX, type SubmitEvent } from 'react';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
  ProductVariantPrice,
} from '@shared/interfaces/product.interface';
import type { ProductInputData, ProductRecord } from '../../../interfaces/product.interface';
import {
  productCustomizationCombinationKey,
  productCustomizationCombinations,
} from '@shared/product-variant-price';
import {
  deleteProductGallery,
  errorMessage,
  saveProduct,
  saveProductGallery,
} from '../../../services/admin.service';
import {
  deleteProductImage,
  uploadProductImage,
  validateProductImage,
} from '../../../services/product-image.service';

type ProductEditorProps = {
  product?: ProductRecord;
  tenantId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

type GalleryDraft = {
  id?: string;
  selections: ProductCustomizationSelection[];
  images: ProductImage[];
  files: File[];
};

const legacyImage = (imageUrl: string): ProductImage => ({
  id: 'legacy-image',
  storagePath: '',
  downloadUrl: imageUrl,
});

export default function ProductEditor({
  product,
  tenantId,
  onClose,
  onSaved,
}: Readonly<ProductEditorProps>): JSX.Element {
  const [name, setName] = useState<string>(product?.name ?? '');
  const [description, setDescription] = useState<string>(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl ?? '');
  const [defaultImages, setDefaultImages] = useState<ProductImage[]>(
    product?.defaultImages ?? (product ? [legacyImage(product.imageUrl)] : []),
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [customizationAttributes, setCustomizationAttributes] = useState<
    ProductCustomizationAttribute[]
  >(
    product?.customizationAttributes?.map((attribute) => ({
      ...attribute,
      options: attribute.options.map((option) => ({ ...option })),
    })) ?? [],
  );
  const [variantPricingEnabled, setVariantPricingEnabled] = useState<boolean>(
    Boolean(product?.variantPrices?.length),
  );
  const [variantPriceDrafts, setVariantPriceDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (product?.variantPrices ?? []).map((variantPrice) => [
        productCustomizationCombinationKey(variantPrice.selections),
        (variantPrice.priceCents / 100).toFixed(2),
      ]),
    ),
  );
  const [galleryDrafts, setGalleryDrafts] = useState<GalleryDraft[]>(
    product?.imageGalleries?.map((gallery) => ({
      id: gallery.id,
      selections: gallery.selections.map((selection) => ({ ...selection })),
      images: gallery.images.map((image) => ({ ...image })),
      files: [],
    })) ?? [],
  );
  const [price, setPrice] = useState<string>(product ? (product.priceCents / 100).toFixed(2) : '');
  const [duration, setDuration] = useState<string>(String(product?.durationMinutes ?? 30));
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>(
    product?.commissionType ?? 'percentage',
  );
  const [commission, setCommission] = useState<string>(
    product
      ? product.commissionType === 'percentage'
        ? String(product.commissionValue / 100)
        : (product.commissionValue / 100).toFixed(2)
      : '35',
  );
  const [active, setActive] = useState<boolean>(product?.active ?? true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const customizationCombinations = productCustomizationCombinations(customizationAttributes);

  const addAttribute = (): void => {
    const firstOptionId = crypto.randomUUID();
    setCustomizationAttributes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: '',
        options: [
          { id: firstOptionId, label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        defaultOptionId: firstOptionId,
      },
    ]);
  };

  const updateAttribute = (
    attributeId: string,
    update: (attribute: ProductCustomizationAttribute) => ProductCustomizationAttribute,
  ): void => {
    setCustomizationAttributes((current) =>
      current.map((attribute) => (attribute.id === attributeId ? update(attribute) : attribute)),
    );
  };

  const addGallery = (): void => {
    setGalleryDrafts((current) => [
      ...current,
      {
        selections: customizationAttributes.map((attribute) => ({
          attributeId: attribute.id,
          optionId: attribute.defaultOptionId,
        })),
        images: [],
        files: [],
      },
    ]);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const parsedPrice = Number(price.replace(',', '.'));
    const parsedCommission = Number(commission.replace(',', '.'));
    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedCommission)) {
      setError('Informe valores numéricos válidos para preço e comissão.');
      setBusy(false);
      return;
    }

    let variantPrices: ProductVariantPrice[] | null = null;
    if (variantPricingEnabled) {
      if (customizationAttributes.length === 0) {
        setError('Adicione pelo menos um atributo para cadastrar preços por combinação.');
        setBusy(false);
        return;
      }
      const parsedVariantPrices = customizationCombinations.map((selections) => {
        const value = variantPriceDrafts[productCustomizationCombinationKey(selections)] ?? price;
        const amount = Number(value.replace(',', '.'));
        return {
          selections,
          priceCents: Math.round(amount * 100),
          valid:
            value.trim() !== '' &&
            Number.isFinite(amount) &&
            amount >= 0 &&
            Number.isSafeInteger(Math.round(amount * 100)),
        };
      });
      if (parsedVariantPrices.some((variantPrice) => !variantPrice.valid)) {
        setError('Informe um preço válido para cada combinação de opções.');
        setBusy(false);
        return;
      }
      variantPrices = parsedVariantPrices.map(({ selections, priceCents }) => ({
        selections,
        priceCents,
      }));
    }

    const canUseLegacyImage = !product?.defaultImages && imageUrl.trim().length > 0;
    const defaultImageCount =
      defaultImages.length +
      imageFiles.length +
      (defaultImages.length === 0 && imageFiles.length === 0 && canUseLegacyImage ? 1 : 0);
    if (defaultImageCount < 1 || defaultImageCount > 10) {
      setError('A galeria padrão deve ter de uma a dez imagens.');
      setBusy(false);
      return;
    }

    const combinationKeys = new Set<string>();
    for (const gallery of galleryDrafts) {
      const selections = customizationAttributes.map((attribute) =>
        gallery.selections.find((selection) => selection.attributeId === attribute.id),
      );
      const validSelections = selections.filter(
        (selection): selection is ProductCustomizationSelection => selection !== undefined,
      );
      const key = validSelections
        .map((selection) => `${selection.attributeId}:${selection.optionId}`)
        .sort()
        .join('|');
      const validOptions = selections.every(
        (selection, index) =>
          selection !== undefined &&
          customizationAttributes[index]?.options.some(
            (option) => option.id === selection.optionId,
          ),
      );
      if (
        customizationAttributes.length === 0 ||
        selections.length !== validSelections.length ||
        !validOptions
      ) {
        setError('Selecione uma opção válida para cada atributo da galeria.');
        setBusy(false);
        return;
      }
      if (
        gallery.images.length + gallery.files.length < 1 ||
        gallery.images.length + gallery.files.length > 10
      ) {
        setError('Cada galeria de combinação deve ter de uma a dez imagens.');
        setBusy(false);
        return;
      }
      if (combinationKeys.has(key)) {
        setError('Cada combinação pode ter somente uma galeria.');
        setBusy(false);
        return;
      }
      combinationKeys.add(key);
    }

    const uploadedImages: ProductImage[] = [];
    const uploadedGalleryImages: ProductImage[][] = [];
    const savedGalleryIndexes = new Set<number>();
    let metadataWriteStarted = false;
    try {
      if (
        (imageFiles.length > 0 || galleryDrafts.some((gallery) => gallery.files.length > 0)) &&
        !tenantId
      ) {
        throw new Error('Não foi possível identificar a empresa para enviar as imagens.');
      }
      const productId = product?.id ?? crypto.randomUUID();

      for (const file of imageFiles) {
        uploadedImages.push(await uploadProductImage(tenantId, productId, file, setUploadProgress));
      }
      for (const gallery of galleryDrafts) {
        const uploaded: ProductImage[] = [];
        for (const file of gallery.files) {
          uploaded.push(await uploadProductImage(tenantId, productId, file, setUploadProgress));
        }
        uploadedGalleryImages.push(uploaded);
      }

      const finalImages = [
        ...(defaultImages.length > 0
          ? defaultImages
          : imageFiles.length === 0 && canUseLegacyImage
            ? [legacyImage(imageUrl)]
            : []),
        ...uploadedImages,
      ];
      if (
        finalImages.length < 1 ||
        finalImages.length > 10 ||
        finalImages.some((image) => !image.downloadUrl)
      ) {
        throw new Error('A galeria padrão deve ter de uma a dez imagens válidas.');
      }
      const productInput: ProductInputData = {
        ...(product ? { id: product.id } : { id: productId }),
        name,
        description,
        imageUrl: finalImages[0]!.downloadUrl,
        priceCents: Math.round(parsedPrice * 100),
        variantPrices,
        durationMinutes: Number(duration),
        commissionType,
        commissionValue: Math.round(parsedCommission * 100),
        active,
        customizationAttributes,
        defaultImages: finalImages,
      };
      const saved = await saveProduct(productInput);
      metadataWriteStarted = true;

      for (const [index, gallery] of galleryDrafts.entries()) {
        const images = [...gallery.images, ...(uploadedGalleryImages[index] ?? [])];
        const selections = customizationAttributes.map((attribute) =>
          gallery.selections.find((selection) => selection.attributeId === attribute.id)!,
        );
        await saveProductGallery({
          productId: saved.id,
          ...(gallery.id ? { galleryId: gallery.id } : {}),
          selections,
          images,
        });
        savedGalleryIndexes.add(index);
      }

      const galleryIdsToKeep = new Set(
        galleryDrafts.flatMap((gallery) => (gallery.id ? [gallery.id] : [])),
      );
      const cleanupPaths = new Set<string>();
      for (const gallery of product?.imageGalleries ?? []) {
        if (!galleryIdsToKeep.has(gallery.id)) {
          const deleted = await deleteProductGallery({
            productId: saved.id,
            galleryId: gallery.id,
          });
          deleted.storagePaths.forEach((path) => cleanupPaths.add(path));
          continue;
        }
        const draftIndex = galleryDrafts.findIndex((draft) => draft.id === gallery.id);
        const draft = galleryDrafts[draftIndex]!;
        const retainedPaths = new Set([
          ...draft.images.map((image) => image.storagePath),
          ...(uploadedGalleryImages[draftIndex] ?? []).map((image) => image.storagePath),
        ]);
        gallery.images.forEach((image) => {
          if (image.storagePath && !retainedPaths.has(image.storagePath)) {
            cleanupPaths.add(image.storagePath);
          }
        });
      }
      const retainedDefaultPaths = new Set(finalImages.map((image) => image.storagePath));
      (product?.defaultImages ?? []).forEach((image) => {
        if (image.storagePath && !retainedDefaultPaths.has(image.storagePath)) {
          cleanupPaths.add(image.storagePath);
        }
      });

      const cleanupErrors: string[] = [];
      for (const path of cleanupPaths) {
        try {
          await deleteProductImage(path);
        } catch (cleanupError: unknown) {
          cleanupErrors.push(`${path}: ${errorMessage(cleanupError)}`);
        }
      }
      await onSaved();
      if (cleanupErrors.length > 0) {
        setError(`Galeria salva, mas a limpeza falhou: ${cleanupErrors.join('; ')}`);
        return;
      }
      onClose();
    } catch (saveError: unknown) {
      const cleanupErrors: string[] = [];
      const unpublishedImages = uploadedGalleryImages.flatMap((images, index) =>
        savedGalleryIndexes.has(index) ? [] : images,
      );
      if (!metadataWriteStarted) {
        unpublishedImages.push(...uploadedImages);
      }
      for (const image of unpublishedImages) {
        try {
          await deleteProductImage(image.storagePath);
        } catch (cleanupError: unknown) {
          cleanupErrors.push(`${image.storagePath}: ${errorMessage(cleanupError)}`);
        }
      }
      setError(
        `${metadataWriteStarted ? 'Os metadados podem ter sido parcialmente salvos. ' : ''}${errorMessage(saveError)}${cleanupErrors.length > 0 ? ` Falhas de limpeza: ${cleanupErrors.join('; ')}` : ''}`,
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <header className="editor-header">
          <div>
            <p className="eyebrow">CATÁLOGO DE SERVIÇOS</p>
            <h2 id="product-editor-title">{product ? 'Editar serviço' : 'Novo serviço'}</h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Nome do serviço
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label>
            Descrição
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={600}
              rows={3}
            />
          </label>
          <label>
            Imagem legada ou imagem de referência (URL)
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => {
                const value = event.target.value;
                setImageUrl(value);
                setDefaultImages((current) =>
                  current.map((image) =>
                    image.id === 'legacy-image' && image.storagePath === ''
                      ? { ...image, downloadUrl: value }
                      : image,
                  ),
                );
              }}
              placeholder="https://…"
            />
          </label>
          <fieldset className="form-stack">
            <legend>Personalização do serviço</legend>
            {customizationAttributes.map((attribute) => (
              <fieldset className="form-stack" key={attribute.id}>
                <legend>Atributo</legend>
                <label>
                  Nome do atributo
                  <input
                    value={attribute.label}
                    onChange={(event) =>
                      updateAttribute(attribute.id, (current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    maxLength={80}
                    required
                  />
                </label>
                {attribute.options.map((option) => (
                  <div className="form-grid" key={option.id}>
                    <label>
                      Opção
                      <input
                        value={option.label}
                        onChange={(event) =>
                          updateAttribute(attribute.id, (current) => ({
                            ...current,
                            options: current.options.map((item) =>
                              item.id === option.id ? { ...item, label: event.target.value } : item,
                            ),
                          }))
                        }
                        maxLength={80}
                        required
                      />
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      aria-label={`Remover opção ${option.label || 'sem nome'}`}
                      disabled={attribute.options.length <= 2}
                      onClick={() =>
                        updateAttribute(attribute.id, (current) => {
                          const options = current.options.filter((item) => item.id !== option.id);
                          return {
                            ...current,
                            options,
                            defaultOptionId:
                              current.defaultOptionId === option.id
                                ? (options[0]?.id ?? '')
                                : current.defaultOptionId,
                          };
                        })
                      }
                    >
                      Remover opção
                    </button>
                  </div>
                ))}
                <label>
                  Opção padrão
                  <select
                    value={attribute.defaultOptionId}
                    onChange={(event) =>
                      updateAttribute(attribute.id, (current) => ({
                        ...current,
                        defaultOptionId: event.target.value,
                      }))
                    }
                  >
                    {attribute.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label || 'Nova opção'}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateAttribute(attribute.id, (current) => ({
                        ...current,
                        options: [...current.options, { id: crypto.randomUUID(), label: '' }],
                      }))
                    }
                  >
                    Adicionar opção
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setCustomizationAttributes((current) =>
                        current.filter((item) => item.id !== attribute.id),
                      )
                    }
                  >
                    Remover atributo
                  </button>
                </div>
              </fieldset>
            ))}
            <button type="button" className="button secondary" onClick={addAttribute}>
              Adicionar atributo
            </button>
          </fieldset>
          <fieldset className="form-stack">
            <legend>Preços por combinação</legend>
            <label className="toggle-row">
              <span>
                <strong>Preço varia conforme as opções</strong>
                <small>Defina o preço final de cada combinação completa de opções.</small>
              </span>
              <input
                type="checkbox"
                checked={variantPricingEnabled}
                onChange={(event) => setVariantPricingEnabled(event.target.checked)}
              />
            </label>
            {variantPricingEnabled &&
              (customizationAttributes.length === 0 ? (
                <p className="muted">Adicione um atributo para configurar os preços variáveis.</p>
              ) : (
                <div className="form-stack">
                  {customizationCombinations.map((selections) => {
                    const key = productCustomizationCombinationKey(selections);
                    const combinationLabel = selections
                      .map((selection) => {
                        const attribute = customizationAttributes.find(
                          (item) => item.id === selection.attributeId,
                        );
                        const option = attribute?.options.find(
                          (item) => item.id === selection.optionId,
                        );
                        return `${attribute?.label || 'Atributo'}: ${option?.label || 'Opção'}`;
                      })
                      .join(' / ');
                    return (
                      <label className="form-grid" key={key}>
                        {combinationLabel}
                        <input
                          aria-label={`Preço da combinação ${combinationLabel} (R$)`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={variantPriceDrafts[key] ?? price}
                          onChange={(event) =>
                            setVariantPriceDrafts((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
          </fieldset>
          <fieldset className="form-stack">
            <legend>Galeria padrão (1 a 10 imagens)</legend>
            <div className="form-grid">
              {defaultImages.map((image, index) => (
                <div className="image-preview" key={image.id}>
                  <img src={image.downloadUrl} alt={`Imagem ${index + 1} da galeria padrão`} />
                  <button
                    type="button"
                    className="button secondary"
                    aria-label={`Remover imagem ${index + 1}`}
                    onClick={() =>
                      setDefaultImages((current) => current.filter((item) => item.id !== image.id))
                    }
                  >
                    Remover imagem
                  </button>
                </div>
              ))}
            </div>
            <label>
              Adicionar imagens
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  try {
                    files.forEach(validateProductImage);
                    if (defaultImages.length + imageFiles.length + files.length > 10) {
                      throw new Error('A galeria padrão pode conter no máximo dez imagens.');
                    }
                    setImageFiles((current) => [...current, ...files]);
                    setError('');
                  } catch (validationError: unknown) {
                    setError(errorMessage(validationError));
                  }
                }}
              />
            </label>
            {imageFiles.map((file, index) => (
              <div className="editor-actions" key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setImageFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index),
                    )
                  }
                >
                  Remover arquivo
                </button>
              </div>
            ))}
            {uploadProgress !== null && (
              <progress aria-label="Progresso do envio" max={1} value={uploadProgress} />
            )}
          </fieldset>
          <fieldset className="form-stack">
            <legend>Galerias por combinação</legend>
            {galleryDrafts.map((gallery, galleryIndex) => (
              <fieldset className="form-stack" key={gallery.id ?? `gallery-${galleryIndex}`}>
                <legend>Combinação {galleryIndex + 1}</legend>
                {customizationAttributes.map((attribute) => {
                  const selectedOptionId = gallery.selections.find(
                    (selection) => selection.attributeId === attribute.id,
                  )?.optionId;
                  return (
                    <label key={attribute.id}>
                      {attribute.label || 'Atributo'}
                      <select
                        value={selectedOptionId ?? attribute.defaultOptionId}
                        onChange={(event) =>
                          setGalleryDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex !== galleryIndex
                                ? item
                                : {
                                    ...item,
                                    selections: [
                                      ...item.selections.filter(
                                        (selection) => selection.attributeId !== attribute.id,
                                      ),
                                      { attributeId: attribute.id, optionId: event.target.value },
                                    ],
                                  },
                            ),
                          )
                        }
                      >
                        {attribute.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
                <div className="form-grid">
                  {gallery.images.map((image, imageIndex) => (
                    <div className="image-preview" key={image.id}>
                      <img
                        src={image.downloadUrl}
                        alt={`Imagem ${imageIndex + 1} da combinação ${galleryIndex + 1}`}
                      />
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          setGalleryDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === galleryIndex
                                ? {
                                    ...item,
                                    images: item.images.filter(
                                      (candidate) => candidate.id !== image.id,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        Remover imagem
                      </button>
                    </div>
                  ))}
                </div>
                <label>
                  Adicionar imagens da combinação
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      try {
                        files.forEach(validateProductImage);
                        if (gallery.images.length + gallery.files.length + files.length > 10) {
                          throw new Error('Cada galeria pode conter no máximo dez imagens.');
                        }
                        setGalleryDrafts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === galleryIndex
                              ? { ...item, files: [...item.files, ...files] }
                              : item,
                          ),
                        );
                        setError('');
                      } catch (validationError: unknown) {
                        setError(errorMessage(validationError));
                      }
                    }}
                  />
                </label>
                {gallery.files.map((file, fileIndex) => (
                  <div
                    className="editor-actions"
                    key={`${file.name}-${file.lastModified}-${fileIndex}`}
                  >
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        setGalleryDrafts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === galleryIndex
                              ? {
                                  ...item,
                                  files: item.files.filter((_, index) => index !== fileIndex),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      Remover arquivo
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setGalleryDrafts((current) =>
                      current.filter((_, itemIndex) => itemIndex !== galleryIndex),
                    )
                  }
                >
                  Remover galeria
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={customizationAttributes.length === 0}
              onClick={addGallery}
            >
              Adicionar galeria de combinação
            </button>
          </fieldset>
          <div className="form-grid">
            <label>
              {variantPricingEnabled ? 'Preço base (R$)' : 'Preço (R$)'}
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </label>
            <label>
              Duração (minutos)
              <input
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Tipo de comissão
              <select
                value={commissionType}
                onChange={(event) => {
                  const next = event.target.value as 'percentage' | 'fixed';
                  setCommissionType(next);
                  setCommission(next === 'percentage' ? '35' : '25.00');
                }}
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>
            <label>
              {commissionType === 'percentage' ? 'Comissão (%)' : 'Comissão (R$)'}
              <input
                type="number"
                min="0"
                max={commissionType === 'percentage' ? 100 : undefined}
                step="0.01"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="toggle-row">
            <span>
              <strong>Serviço ativo</strong>
              <small>Serviços ativos aparecem no catálogo público.</small>
            </span>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <footer className="editor-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? 'Salvando…' : product ? 'Salvar alterações' : 'Criar serviço'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
