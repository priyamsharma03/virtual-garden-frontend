import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Plant } from '../../models/plant.model';

@Component({
  selector: 'app-plant-card',
  imports: [RouterLink],
  templateUrl: './plant-card.component.html',
  styleUrl: './plant-card.component.scss'
})
export class PlantCardComponent {
  @Input({ required: true }) plant!: Plant;
}
