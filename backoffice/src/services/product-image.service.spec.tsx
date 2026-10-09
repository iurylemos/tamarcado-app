import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { uploadProductImage, validateProductImage } from './product-image.service';

vi.mock('firebase/storage', () => ({
  deleteObject: vi.fn(),
  getDownloadURL: vi.fn(),
  ref: vi.fn((_, path: string) => ({ fullPath: path })),
  uploadBytesResumable: vi.fn(),
}));
vi.mock('../config/firebase.config', () => ({ storage: {} }));

describe('product image upload service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts supported image types up to the 5 MB limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(() => validateProductImage(new File(['x'], 'product-image', { type }))).not.toThrow();
    }
    expect(() =>
      validateProductImage(
        new File([new Uint8Array(5 * 1024 * 1024)], 'large.png', { type: 'image/png' }),
      ),
    ).not.toThrow();
  });

  it('rejects unsupported MIME types, empty files, and files larger than 5 MB', () => {
    expect(() => validateProductImage(new File(['x'], 'image.gif', { type: 'image/gif' }))).toThrow(
      'Use uma imagem JPEG, PNG ou WebP.',
    );
    expect(() => validateProductImage(new File([], 'empty.png', { type: 'image/png' }))).toThrow(
      'Cada imagem deve ter conteúdo e no máximo 5 MB.',
    );
    expect(() =>
      validateProductImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
      ),
    ).toThrow('Cada imagem deve ter conteúdo e no máximo 5 MB.');
  });

  it('reports upload progress and returns the resolved storage image reference', async () => {
    const progress = vi.fn();
    const uploadTask = {
      snapshot: { ref: { fullPath: 'product-images/tenant-a/product-a/image-a' } },
      on: vi.fn(
        (
          _event: string,
          onProgress: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
          _onError: (error: Error) => void,
          onComplete: () => void,
        ) => {
          onProgress({ bytesTransferred: 1, totalBytes: 2 });
          onComplete();
        },
      ),
    };
    vi.mocked(uploadBytesResumable).mockReturnValue(uploadTask as never);
    vi.mocked(getDownloadURL).mockResolvedValue('https://storage.example.test/image-a');

    await expect(
      uploadProductImage(
        'tenant-a',
        'product-a',
        new File(['x'], 'image.png', { type: 'image/png' }),
        progress,
      ),
    ).resolves.toMatchObject({
      storagePath: expect.stringMatching(/^product-images\/tenant-a\/product-a\//),
      downloadUrl: 'https://storage.example.test/image-a',
    });
    expect(progress).toHaveBeenCalledWith(0.5);
  });
});
