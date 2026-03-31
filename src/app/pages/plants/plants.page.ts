import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlantCardComponent } from '../../components/plant-card/plant-card.component';
import { PlantService } from '../../services/plant.service';
import { PlantCategory } from '../../models/plant.model';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-plants-page',
  imports: [FormsModule, PlantCardComponent],
  templateUrl: './plants.page.html',
  styleUrl: './plants.page.scss',
  animations: [fadeInUp]
})
export class PlantsPageComponent {
  private readonly plantService = inject(PlantService);

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal<'All' | PlantCategory>('All');

  protected readonly plants = toSignal(this.plantService.getPlants(), { initialValue: [] });

  protected readonly categories = computed(() => {
    const knownCategories = new Set(this.plants().map((plant) => plant.category));
    return ['All', ...knownCategories] as Array<'All' | PlantCategory>;
  });

  protected readonly filteredPlants = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.plants().filter((plant) => {
      const matchesName =
        plant.commonName.toLowerCase().includes(query) || plant.scientificName.toLowerCase().includes(query);
      const matchesCategory = category === 'All' || plant.category === category;
      return matchesName && matchesCategory;
    });
  });
}
