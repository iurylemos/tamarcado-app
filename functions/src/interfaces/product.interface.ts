import { PublicProductDocument } from '../model/product.model';

export type PublicProductRecord = PublicProductDocument & { id: string };
