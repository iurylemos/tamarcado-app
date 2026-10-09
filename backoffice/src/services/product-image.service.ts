import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import type { ProductImage } from '@shared/interfaces/product.interface';
import { storage } from '../config/firebase.config';

const maxImageSize = 5 * 1024 * 1024;
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateProductImage(file: File): void {
  if (!acceptedImageTypes.has(file.type)) {
    throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  }
  if (file.size === 0 || file.size > maxImageSize) {
    throw new Error('Cada imagem deve ter conteúdo e no máximo 5 MB.');
  }
}

export async function uploadProductImage(
  tenantId: string,
  productId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ProductImage> {
  validateProductImage(file);
  const id = crypto.randomUUID();
  const storagePath = `product-images/${tenantId}/${productId}/${id}`;
  const task: UploadTask = uploadBytesResumable(ref(storage, storagePath), file, {
    contentType: file.type,
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes);
      },
      reject,
      resolve,
    );
  });

  try {
    return {
      id,
      storagePath,
      downloadUrl: await getDownloadURL(task.snapshot.ref),
    };
  } catch (error: unknown) {
    try {
      await deleteObject(task.snapshot.ref);
    } catch (cleanupError: unknown) {
      const message =
        cleanupError instanceof Error ? cleanupError.message : 'erro desconhecido na limpeza';
      throw new Error(
        `Não foi possível obter a URL da imagem nem limpar ${storagePath}: ${message}`,
      );
    }
    throw error;
  }
}

export async function deleteProductImage(storagePath: string): Promise<void> {
  if (!storagePath.startsWith('product-images/')) {
    throw new Error('O caminho da imagem não pertence ao armazenamento de produtos.');
  }
  await deleteObject(ref(storage, storagePath));
}
