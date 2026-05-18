export type PlantCategory = string;

export interface Plant {
  id: string;
  commonName: string;
  scientificName: string;
  category: PlantCategory;
  ayushSystem?: string | null;
  imageUrl: string;
  modelUrl?: string | null;
  shortDescription: string;
  description: string;
  foundIn: string[];
  medicinalUses: string[];
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface AyushSystem {
  id: number;
  name: string;
  description?: string | null;
}
