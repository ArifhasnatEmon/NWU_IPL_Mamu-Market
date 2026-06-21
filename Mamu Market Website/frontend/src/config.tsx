
import { Category } from './types';

export const CATEGORIES: Category[] = [];

export const getCategoryName = (categoryId: string): string => {
  return '';
};

export const FREE_SHIPPING_THRESHOLD = 10000;
export const getShippingFee = (subtotal: number): number =>
  subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal >= 2000 ? 150 : 100;
