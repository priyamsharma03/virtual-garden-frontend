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
  protected readonly interactionTips = [
    'Desktop: click to lock view, then move with W A S D keys',
    'Desktop: double-click any plant to pin its details panel',
    'Mobile/Tablet: drag to orbit and pinch to zoom',
    'Walk close to plants to auto-view contextual medicinal info'
  ];

  private readonly threeGardenService = inject(ThreeGardenService);
  private readonly plantService = inject(PlantService);
  private readonly plants = toSignal(this.plantService.getPlants(), { initialValue: [] });
  private readonly viewReady = signal(false);

  private sceneHandle?: SceneHandle;

  constructor(

    
  ) {
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

  onMovePress(direction: GardenMoveDirection, event: Event) {
    event.preventDefault();
    this.sceneHandle?.setMobileMove?.(direction, true);
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

  ngOnDestroy() {
    this.stopAllMoves();
    this.sceneHandle?.dispose();
  }

  private updateMobileView() {
    this.isMobileView.set(window.matchMedia('(max-width: 900px)').matches);
  }
}
