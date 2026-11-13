import type { ProductCustomizationAttribute } from '@shared/interfaces/product.interface';
import type { ProductRecord } from './product.interface';

export interface DeliveryRowSelection {
  attributeId: string;
  optionId: string;
}

export interface DeliveryRow {
  product: ProductRecord;
  attributes: ProductCustomizationAttribute[];
  selections: DeliveryRowSelection[];
  rawQuantity: string;
  quantity: number;
  validQuantity: boolean;
  days: number | undefined;
}

export interface DeliveryGroup {
  id: string;
  label: string;
  combinations: DeliveryRowSelection[][];
}
