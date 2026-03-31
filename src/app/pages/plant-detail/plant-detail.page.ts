import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { PlantService } from '../../services/plant.service';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-plant-detail-page',
  imports: [RouterLink],
  templateUrl: './plant-detail.page.html',
  styleUrl: './plant-detail.page.scss',
  animations: [fadeInUp]
})
export class PlantDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly plantService = inject(PlantService);

  protected readonly plant = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => this.plantService.getPlantById(id))
    ),
    { initialValue: undefined }
  );
}
