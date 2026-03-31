import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, shareReplay } from 'rxjs/operators';
import type { Plant } from '../models/plant.model';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private readonly http = inject(HttpClient);

  private readonly plants$ = this.http.get<Plant[]>('assets/data/plants.json').pipe(shareReplay(1));

  getPlants() {
    return this.plants$;
  }

  getFeaturedPlants(limit = 3) {
    return this.plants$.pipe(map((plants) => plants.slice(0, limit)));
  }

  getPlantById(id: string) {
    return this.plants$.pipe(map((plants) => plants.find((plant) => plant.id === id)));
  }
}
