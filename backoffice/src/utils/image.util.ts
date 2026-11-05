import type { ProductImage } from '@shared/interfaces/product.interface';

export class ImageUtil {
  public static legacyImage(imageUrl: string): ProductImage {
    return {
      id: 'legacy-image',
      storagePath: '',
      downloadUrl: imageUrl,
    };
  }
}
