export interface SubCategory {
  id: string;
  dbId?: string;
  name: string;
  count?: number;
}

export interface Category {
  id: string;
  dbId?: string;
  name: string;
  count?: number;
  icon: string;
  subcategories?: SubCategory[];
}
