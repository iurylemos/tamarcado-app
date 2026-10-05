import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type { ShowcaseProduct } from '../interfaces/company.interface';

export async function listPublicProducts(): Promise<ShowcaseProduct[]> {
  const result = await getDocs(
    query(
      collection(db, 'public_products'),
      where('published', '==', true),
      where('active', '==', true),
    ),
  );

  return result.docs
    .map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name as string,
        description: data.description as string | undefined,
        imageUrl: data.imageUrl as string,
        priceCents: data.priceCents as number,
        durationMinutes: data.durationMinutes as number,
        businessSlug: data.businessSlug as string,
      };
    })
    .filter((product) => Number.isInteger(product.priceCents) && Boolean(product.businessSlug))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
