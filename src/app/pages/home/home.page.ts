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

  protected readonly impactStats = [
    { label: 'Medicinal Species Cataloged', value: '120+' },
    { label: 'Interactive Learning Modules', value: '24' },
    { label: 'Regions and Habitats Covered', value: '40+' },
    { label: '3D Plant Spots in Garden', value: '50+' }
  ];

  protected readonly pathways = [
    {
      title: 'Discover',
      text: 'Browse plant cards with scientific names, categories, and practical medicinal summaries.'
    },
    {
      title: 'Understand',
      text: 'Open detailed product-style pages to learn where each plant is found and how it is traditionally used.'
    },
    {
      title: 'Explore in 3D',
      text: 'Walk through an immersive virtual garden and inspect plant information directly inside the scene.'
    }
  ];

  protected readonly highlights = [
    'Structured plant taxonomy and medicinal metadata',
    'Ecommerce-inspired plant detail pages for focused reading',
    'Smooth animations, dark mode, and responsive design system',
    'Interactive Three.js garden with live contextual details'
  ];

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
