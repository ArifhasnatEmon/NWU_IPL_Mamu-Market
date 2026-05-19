
import { Category } from './types';

export const CATEGORIES: Category[] = [
  { 
    id: 'electronics', 
    name: 'Electronics', 
    icon: 'fa-laptop',
    subcategories: [
      { id: 'phones', name: 'Phones' },
      { id: 'laptops', name: 'Laptops' },
      { id: 'headphones', name: 'Headphones' },
      { id: 'appliances', name: 'Appliances' },
      { id: 'cameras-accessories', name: 'Cameras & Accessories' }
    ]
  },
  { 
    id: 'fashion', 
    name: 'Fashion', 
    icon: 'fa-shirt',
    subcategories: [
      { id: 'men', name: 'Men' },
      { id: 'women', name: 'Women' },
      { id: 'kids', name: 'Kids' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'watches', name: 'Watches' }
    ]
  },
  { 
    id: 'home-living', 
    name: 'Home & Living', 
    icon: 'fa-house',
    subcategories: [
      { id: 'furniture', name: 'Furniture' },
      { id: 'decor', name: 'Decor' },
      { id: 'kitchen', name: 'Kitchen' },
      { id: 'pets', name: 'Pet Supplies' },
      { id: 'books', name: 'Books' }
    ]
  },
  { 
    id: 'beauty', 
    name: 'Beauty & Health', 
    icon: 'fa-heart-pulse',
    subcategories: [
      { id: 'skincare', name: 'Skincare' },
      { id: 'makeup', name: 'Makeup' }
    ]
  },
  { 
    id: 'sports', 
    name: 'Sports & Outdoor', 
    icon: 'fa-dumbbell',
    subcategories: [
      { id: 'fitness', name: 'Fitness' },
      { id: 'outdoor', name: 'Outdoor' }
    ]
  }
];

export const getCategoryName = (categoryId: string): string => {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category ? category.name : '';
};

export const FREE_SHIPPING_THRESHOLD = 10000;
export const getShippingFee = (subtotal: number): number =>
  subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal >= 2000 ? 150 : 100;
