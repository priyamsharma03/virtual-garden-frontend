import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlantCardComponent } from '../../components/plant-card/plant-card.component';
import { PlantService } from '../../services/plant.service';
import { SceneHandle, ThreeGardenService } from '../../services/three-garden.service';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PlantCardComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  animations: [fadeInUp]
})
export class HomePageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewCanvas', { static: false }) previewCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly plantService = inject(PlantService);
  private readonly threeGardenService = inject(ThreeGardenService);

  protected readonly featuredPlants = toSignal(this.plantService.getFeaturedPlants(3), {
    initialValue: []
  });

  private sceneHandle?: SceneHandle;

  ngAfterViewInit() {
    if (this.previewCanvas) {
      this.sceneHandle = this.threeGardenService.initPreview(this.previewCanvas.nativeElement);
    }
  }

  ngOnDestroy() {
    this.sceneHandle?.dispose();
  }

  scrollToFeatured() {
    document.getElementById('featured-plants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
