import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Plant } from '../../models/plant.model';
import { applyPlantImageFallback, resolvePlantImageUrl } from '../../shared/image-utils';

@Component({
  selector: 'app-plant-card',
  imports: [RouterLink],
  templateUrl: './plant-card.component.html',
  styleUrl: './plant-card.component.scss'
})
export class PlantCardComponent {
  @Input({ required: true }) plant!: Plant;

  protected readonly resolvePlantImageUrl = resolvePlantImageUrl;

  protected handleImageError(event: Event) {
    applyPlantImageFallback(event);
  }
}
