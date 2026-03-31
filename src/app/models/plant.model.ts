export type PlantCategory = 'Ayurvedic' | 'Herbs' | 'Trees';

export interface Plant {
  id: string;
  commonName: string;
  scientificName: string;
  category: PlantCategory;
  imageUrl: string;
  shortDescription: string;
  description: string;
  foundIn: string[];
  medicinalUses: string[];
}
