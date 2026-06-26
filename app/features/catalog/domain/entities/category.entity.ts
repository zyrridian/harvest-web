export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  gradientColors: string[];
  productCount: number;
  displayOrder: number;
  isActive: boolean;
}


