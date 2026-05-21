export const PLANT_PLACEHOLDER_IMAGE_URL = 'assets/images/plant-placeholder.svg';

export function resolvePlantImageUrl(imageUrl?: string | null): string {
  const value = imageUrl?.trim();
  return value ? value : PLANT_PLACEHOLDER_IMAGE_URL;
}

export function applyPlantImageFallback(event: Event): void {
  const image = event.target as HTMLImageElement | null;
  if (!image || image.dataset['fallbackApplied'] === 'true') {
    return;
  }

  image.dataset['fallbackApplied'] = 'true';
  image.src = PLANT_PLACEHOLDER_IMAGE_URL;
}