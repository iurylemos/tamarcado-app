import type { JSX } from 'react';
import type { ProductImage } from '@shared/interfaces/product.interface';

type ProductImageGalleryProps = {
  images: ProductImage[];
  selectedImageId: string;
  onSelect: (imageId: string) => void;
  productName: string;
};

export default function ProductImageGallery({
  images,
  selectedImageId,
  onSelect,
  productName,
}: Readonly<ProductImageGalleryProps>): JSX.Element | null {
  if (images.length === 0) {
    return (
      <section className="product-image-gallery" aria-label={`Imagens de ${productName}`}>
        <div className="product-image-gallery__empty" role="status">
          Imagens não disponíveis para esta combinação.
        </div>
      </section>
    );
  }

  const selectedIndex = Math.max(
    0,
    images.findIndex((image) => image.id === selectedImageId),
  );
  const selectedImage = images[selectedIndex]!;
  const selectRelative = (offset: number): void => {
    const nextIndex = (selectedIndex + offset + images.length) % images.length;
    onSelect(images[nextIndex]!.id);
  };

  return (
    <section className="product-image-gallery" aria-label={`Imagens de ${productName}`}>
      <img
        className="product-image-gallery__main"
        src={selectedImage.downloadUrl}
        alt={`${productName}, imagem ${selectedIndex + 1}`}
      />
      {images.length > 1 && (
        <>
          <div className="product-image-gallery__controls">
            <button type="button" aria-label="Imagem anterior" onClick={() => selectRelative(-1)}>
              Anterior
            </button>
            <span aria-live="polite">
              {selectedIndex + 1} de {images.length}
            </span>
            <button type="button" aria-label="Próxima imagem" onClick={() => selectRelative(1)}>
              Próxima
            </button>
          </div>
          <div className="product-image-gallery__thumbnails" aria-label="Miniaturas">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Selecionar imagem ${index + 1}`}
                aria-pressed={image.id === selectedImage.id}
                onClick={() => onSelect(image.id)}
              >
                <img src={image.downloadUrl} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
