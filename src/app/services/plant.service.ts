import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import type { AyushSystem, Category, Plant } from '../models/plant.model';
import { environment } from '../../environments/environment.prod';

export const API_BASE_URL = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private readonly http = inject(HttpClient);
  private readonly refreshPlants$ = new BehaviorSubject<void>(undefined);

  private readonly plants$ = this.refreshPlants$.pipe(
    switchMap(() =>
      this.http.get<Plant[]>(`${API_BASE_URL}/plants`).pipe(
        catchError(() => this.http.get<Plant[]>('assets/data/plants.json'))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getPlants(): Observable<Plant[]> {
    return this.plants$;
  }

  refreshPlants() {
    this.refreshPlants$.next();
  }

  getFeaturedPlants(limit = 3): Observable<Plant[]> {
    return this.plants$.pipe(map((plants) => plants.slice(0, limit)));
  }

  getPlantById(id: string): Observable<Plant | undefined> {
    return this.plants$.pipe(map((plants) => plants.find((plant) => plant.id === id)));
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_BASE_URL}/categories`).pipe(
      catchError(() =>
        this.plants$.pipe(
          map((plants) =>
            Array.from(new Set(plants.map((plant) => plant.category))).map((name, index) => ({
              id: index + 1,
              name
            }))
          )
        )
      )
    );
  }

  getAyushSystems(): Observable<AyushSystem[]> {
    return this.http.get<AyushSystem[]>(`${API_BASE_URL}/ayush-systems`).pipe(catchError(() => of([])));
  }

  createPlant(payload: FormData): Observable<Plant> {
    return this.http.post<Plant>(`${API_BASE_URL}/plants`, payload).pipe(tap(() => this.refreshPlants()));
  }

  updatePlant(plantId: string, payload: FormData): Observable<Plant> {
    return this.http.put<Plant>(`${API_BASE_URL}/plants/${plantId}`, payload).pipe(tap(() => this.refreshPlants()));
  }

  deletePlant(plantId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/plants/${plantId}`).pipe(tap(() => this.refreshPlants()));
  }
}
