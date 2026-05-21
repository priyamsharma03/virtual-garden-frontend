import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  GardenPlantFocus,
  GardenMoveDirection,
  SceneHandle,
  ThreeGardenService
} from '../../services/three-garden.service';
import { PlantService } from '../../services/plant.service';
import { fadeInUp } from '../../shared/animations';
import { applyPlantImageFallback, resolvePlantImageUrl } from '../../shared/image-utils';

@Component({
  selector: 'app-garden-3d-page',
  templateUrl: './garden-3d.page.html',
  styleUrl: './garden-3d.page.scss',
  animations: [fadeInUp]
})
export class Garden3dPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gardenCanvas', { static: false }) gardenCanvas?: ElementRef<HTMLCanvasElement>;

  protected readonly focusedPlant = signal<GardenPlantFocus | null>(null);
  protected readonly isMobileView = signal(false);
  protected readonly isIntroVisible = signal(false);
  protected readonly interactionTips = [
    'Desktop: click to lock view, then move with W A S D keys',
    'Desktop: double-click any plant to pin its details panel',
    'Mobile/Tablet: drag to orbit and pinch to zoom',
    'Walk close to plants to auto-view contextual medicinal info'
  ];

  protected readonly resolvePlantImageUrl = resolvePlantImageUrl;

  private readonly threeGardenService = inject(ThreeGardenService);
  private readonly plantService = inject(PlantService);
  private readonly plants = toSignal(this.plantService.getPlants(), { initialValue: [] });
  private readonly viewReady = signal(false);

  private sceneHandle?: SceneHandle;

  constructor() {
    this.updateMobileView();

    effect(() => {
      if (!this.viewReady() || this.sceneHandle || !this.gardenCanvas) {
        return;
      }

      const plants = this.plants();
      if (!plants.length) {
        return;
      }

      this.sceneHandle = this.threeGardenService.initFullGarden(
        this.gardenCanvas.nativeElement,
        plants,
        (focus) => this.focusedPlant.set(focus)
      );
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateMobileView();
  }

  toggleIntro() {
    this.isIntroVisible.update((v) => !v);
  }

  onMovePress(direction: GardenMoveDirection, event: Event) {
    event.preventDefault();
    this.sceneHandle?.setMobileMove?.(direction, true);
  }

  openModel(rawUrl: string | null) {
    const resolved = this.resolveSketchfabEmbedUrl(rawUrl ?? '') ?? rawUrl;
    if (resolved) {
      window.open(resolved, '_blank', 'noopener');
    }
  }

  onMoveRelease(direction: GardenMoveDirection, event?: Event) {
    event?.preventDefault();
    this.sceneHandle?.setMobileMove?.(direction, false);
  }

  stopAllMoves(event?: Event) {
    event?.preventDefault();
    this.sceneHandle?.setMobileMove?.('forward', false);
    this.sceneHandle?.setMobileMove?.('backward', false);
    this.sceneHandle?.setMobileMove?.('left', false);
    this.sceneHandle?.setMobileMove?.('right', false);
  }

  protected handleImageError(event: Event) {
    applyPlantImageFallback(event);
  }

  ngOnDestroy() {
    this.stopAllMoves();
    this.sceneHandle?.dispose();
  }

  private updateMobileView() {
    this.isMobileView.set(window.matchMedia('(max-width: 900px)').matches);
  }

  private resolveSketchfabEmbedUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    const url = srcMatch?.[1] ?? trimmed;
    if (/\/embed(?:\?|$)/i.test(url)) {
      return url;
    }

    const idMatch = url.match(/(?:models\/|3d-models\/[^/]+-)([a-f0-9]{32})(?:[/?#]|$)/i);
    if (idMatch?.[1]) {
      return `https://sketchfab.com/models/${idMatch[1]}/embed`;
    }

    return url;
  }
}
