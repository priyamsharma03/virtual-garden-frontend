import { Injectable } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as THREE from 'three';
import type { Plant } from '../models/plant.model';

export interface GardenPlantFocus {
  id: string;
  commonName: string;
  scientificName: string;
  category: string;
  imageUrl: string;
  description: string;
  shortDescription: string;
  medicinalUses: string[];
  distance: number;
}

export type GardenMoveDirection = 'forward' | 'backward' | 'left' | 'right';

export interface SceneHandle {
  dispose: () => void;
  setMobileMove?: (direction: GardenMoveDirection, active: boolean) => void;
}

interface SceneOptions {
  fullScreen: boolean;
  controls: boolean;
  plants: Plant[];
  onPlantFocus?: (focus: GardenPlantFocus | null) => void;
}

interface GardenPlantMesh {
  info: Plant;
  group: THREE.Group;
  swayNodes: THREE.Object3D[];
  anchor: THREE.Vector3;
  selectableMeshes: THREE.Mesh[];
}

interface PlantModelResult {
  group: THREE.Group;
  swayNodes: THREE.Object3D[];
  selectableMeshes: THREE.Mesh[];
  labelHeight: number;
  focusHeight: number;
}

@Injectable({
  providedIn: 'root'
})
export class ThreeGardenService {
  private readonly upVector = new THREE.Vector3(0, 1, 0);

  initPreview(canvas: HTMLCanvasElement): SceneHandle {
    return this.buildScene(canvas, { fullScreen: false, controls: false, plants: [] });
  }

  initFullGarden(
    canvas: HTMLCanvasElement,
    plants: Plant[] = [],
    onPlantFocus?: (focus: GardenPlantFocus | null) => void
  ): SceneHandle {
    return this.buildScene(canvas, {
      fullScreen: true,
      controls: true,
      plants,
      onPlantFocus
    });
  }

  private buildScene(canvas: HTMLCanvasElement, options: SceneOptions): SceneHandle {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.fullScreen ? '#cbe6c3' : '#e8f2e0');
    scene.fog = options.fullScreen ? new THREE.Fog('#cbe6c3', 22, 90) : null;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 140);
    camera.position.set(7, options.fullScreen ? 1.8 : 6, options.fullScreen ? 18 : 9);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: !options.fullScreen
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x8a785d, 1.25);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 1.8);
    directionalLight.position.set(18, 25, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.022;
    const shadowCamera = directionalLight.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -48;
    shadowCamera.right = 48;
    shadowCamera.top = 48;
    shadowCamera.bottom = -48;
    shadowCamera.near = 1;
    shadowCamera.far = 85;
    shadowCamera.updateProjectionMatrix();
    scene.add(directionalLight);

    const fillLight = new THREE.PointLight('#cde8ff', 0.55, 75);
    fillLight.position.set(-18, 10, -12);
    scene.add(fillLight);

    const warmBounce = new THREE.PointLight('#ffd8a6', 0.3, 50);
    warmBounce.position.set(14, 5, 20);
    scene.add(warmBounce);

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 20),
      new THREE.MeshBasicMaterial({
        color: '#d8e9ff',
        side: THREE.BackSide
      })
    );
    scene.add(skyDome);

    const grassTexture = this.createGrassTexture();
    const pathTexture = this.createPathTexture();
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.wrapS = THREE.RepeatWrapping;
    pathTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(options.fullScreen ? 18 : 6, options.fullScreen ? 18 : 6);
    pathTexture.repeat.set(12, 12);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    grassTexture.anisotropy = maxAnisotropy;
    pathTexture.anisotropy = maxAnisotropy;

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(options.fullScreen ? 45 : 8, 84),
      new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 1,
        metalness: 0
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    if (options.fullScreen) {
      const walkway = new THREE.Mesh(
        new THREE.RingGeometry(11, 14.6, 80),
        new THREE.MeshStandardMaterial({
          map: pathTexture,
          color: '#d6c5a8',
          roughness: 0.96,
          metalness: 0
        })
      );
      walkway.rotation.x = -Math.PI / 2;
      walkway.position.y = 0.02;
      scene.add(walkway);

      const centerBed = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6.5, 0.7, 64),
        new THREE.MeshStandardMaterial({ color: '#8e6c4d', roughness: 0.95 })
      );
      centerBed.position.y = 0.34;
      centerBed.receiveShadow = true;
      scene.add(centerBed);
    }

    scene.add(this.createGardenDetails(options.fullScreen));

    const plants = this.createPlants(options.plants, options.fullScreen);
    plants.forEach((plant) => scene.add(plant.group));

    const useWalkMode = options.controls && options.fullScreen && !window.matchMedia('(pointer: coarse)').matches;
    const useMobileButtonMovement = options.controls && !useWalkMode;
    let orbitControls: OrbitControls | undefined;
    let pointerControls: PointerLockControls | undefined;

    const moveState: Record<GardenMoveDirection, boolean> = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    if (useWalkMode) {
      pointerControls = new PointerLockControls(camera, renderer.domElement);
      pointerControls.object.position.set(0, 1.75, 18);
      scene.add(pointerControls.object);
    } else if (options.controls) {
      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.minDistance = 6;
      orbitControls.maxDistance = options.fullScreen ? 42 : 22;
      orbitControls.maxPolarAngle = Math.PI / 2.04;
      orbitControls.target.set(0, 1.2, 0);
    }

    const keyState = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code in keyState) {
        keyState[event.code as keyof typeof keyState] = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code in keyState) {
        keyState[event.code as keyof typeof keyState] = false;
      }
    };

    const onCanvasClick = () => {
      if (pointerControls && !pointerControls.isLocked) {
        pointerControls.lock();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('click', onCanvasClick);

    const selectableMeshes = plants.flatMap((plant) => plant.selectableMeshes);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let selectedPlantId: string | null = null;
    let focusedPlantId: string | null = null;
    let focusedDistanceBucket = -1;

    const pickPlantId = (event: MouseEvent) => {
      if (!selectableMeshes.length) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(selectableMeshes, false);
      const id = intersects[0]?.object.userData['plantId'];
      return typeof id === 'string' ? id : null;
    };

    const onSingleClickPick = (event: MouseEvent) => {
      if (!useMobileButtonMovement) {
        return;
      }

      const id = pickPlantId(event);
      if (id) {
        selectedPlantId = id;
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      const id = pickPlantId(event);
      if (id) {
        selectedPlantId = id;
      }
    };

    canvas.addEventListener('click', onSingleClickPick);
    canvas.addEventListener('dblclick', onDoubleClick);

    const syncPlantFocus = (observerPosition: THREE.Vector3) => {
      if (!plants.length) {
        return;
      }

      let nearestPlant: GardenPlantMesh | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const plant of plants) {
        const distance = observerPosition.distanceTo(plant.anchor);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlant = plant;
        }
      }

      const selectedPlant = selectedPlantId
        ? plants.find((plant) => plant.info.id === selectedPlantId)
        : undefined;

      const activePlant = selectedPlant ?? (nearestDistance < 8 ? nearestPlant : undefined);
      const activeDistance = activePlant ? observerPosition.distanceTo(activePlant.anchor) : 0;

      if (!activePlant) {
        if (focusedPlantId !== null) {
          focusedPlantId = null;
          focusedDistanceBucket = -1;
          options.onPlantFocus?.(null);
        }
        return;
      }

      const nextDistanceBucket = Math.round(activeDistance * 2);
      if (activePlant.info.id !== focusedPlantId || nextDistanceBucket !== focusedDistanceBucket) {
        focusedPlantId = activePlant.info.id;
        focusedDistanceBucket = nextDistanceBucket;
        options.onPlantFocus?.({
          id: activePlant.info.id,
          commonName: activePlant.info.commonName,
          scientificName: activePlant.info.scientificName,
          category: activePlant.info.category,
          imageUrl: activePlant.info.imageUrl,
          description: activePlant.info.description,
          shortDescription: activePlant.info.shortDescription,
          medicinalUses: activePlant.info.medicinalUses,
          distance: activeDistance
        });
      }
    };

    const cloudCluster = this.createCloudCluster(41);
    cloudCluster.position.set(-12, 18, -15);
    scene.add(cloudCluster);

    const cloudClusterB = this.createCloudCluster(97);
    cloudClusterB.position.set(18, 15, 10);
    cloudClusterB.scale.setScalar(0.8);
    scene.add(cloudClusterB);

    const disposableTextures: THREE.Texture[] = [grassTexture, pathTexture];
    const clock = new THREE.Clock();
    const walkVelocity = new THREE.Vector2();
    const targetWalkVelocity = new THREE.Vector2();
    const mobileVelocity = new THREE.Vector3();
    const targetMobileVelocity = new THREE.Vector3();
    const mobileForward = new THREE.Vector3();
    const mobileRight = new THREE.Vector3();
    const mobileMoveVector = new THREE.Vector3();
    let elapsed = 0;
    let animationFrameId = 0;

    const resizeScene = () => {
      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeScene();

    const resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(canvas);

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.033);
      elapsed += delta;

      plants.forEach((plant) => {
        plant.swayNodes.forEach((node) => {
          const phase = Number(node.userData['swayPhase'] ?? 0);
          const amplitude = Number(node.userData['swayAmplitude'] ?? 0.045);
          const speed = Number(node.userData['swaySpeed'] ?? 1.2);
          const baseX = Number(node.userData['baseRotationX'] ?? 0);
          const baseZ = Number(node.userData['baseRotationZ'] ?? 0);
          node.rotation.x = baseX + Math.cos(elapsed * speed + phase) * amplitude * 0.24;
          node.rotation.z = baseZ + Math.sin(elapsed * speed + phase) * amplitude;
        });
      });

      cloudCluster.position.x += delta * 0.45;
      cloudClusterB.position.x -= delta * 0.35;
      if (cloudCluster.position.x > 24) {
        cloudCluster.position.x = -24;
      }
      if (cloudClusterB.position.x < -24) {
        cloudClusterB.position.x = 24;
      }

      if (pointerControls && pointerControls.isLocked) {
        const movementSpeed = 7.2;
        targetWalkVelocity.set(
          (Number(keyState.KeyD) - Number(keyState.KeyA)) * movementSpeed,
          (Number(keyState.KeyW) - Number(keyState.KeyS)) * movementSpeed
        );
        if (targetWalkVelocity.lengthSq() > movementSpeed * movementSpeed) {
          targetWalkVelocity.normalize().multiplyScalar(movementSpeed);
        }

        walkVelocity.lerp(targetWalkVelocity, 1 - Math.exp(-delta * 9));
        if (Math.abs(walkVelocity.y) > 0.001) {
          pointerControls.moveForward(walkVelocity.y * delta);
        }
        if (Math.abs(walkVelocity.x) > 0.001) {
          pointerControls.moveRight(walkVelocity.x * delta);
        }

        const walker = pointerControls.object;
        walker.position.y = 1.75;
        walker.position.x = THREE.MathUtils.clamp(walker.position.x, -40, 40);
        walker.position.z = THREE.MathUtils.clamp(walker.position.z, -40, 40);
      }

      if (useMobileButtonMovement && orbitControls) {
        const moveSpeed = 6.1;
        mobileForward.subVectors(orbitControls.target, camera.position);
        mobileForward.y = 0;
        targetMobileVelocity.set(0, 0, 0);

        if (mobileForward.lengthSq() > 0.0001) {
          mobileForward.normalize();
          mobileRight.crossVectors(mobileForward, this.upVector).normalize();
          mobileMoveVector.set(0, 0, 0);

          if (moveState.forward) {
            mobileMoveVector.add(mobileForward);
          }
          if (moveState.backward) {
            mobileMoveVector.sub(mobileForward);
          }
          if (moveState.right) {
            mobileMoveVector.add(mobileRight);
          }
          if (moveState.left) {
            mobileMoveVector.sub(mobileRight);
          }

          if (mobileMoveVector.lengthSq() > 0.0001) {
            targetMobileVelocity.copy(mobileMoveVector.normalize().multiplyScalar(moveSpeed));
          }
        }

        mobileVelocity.lerp(targetMobileVelocity, 1 - Math.exp(-delta * 8));
        if (mobileVelocity.lengthSq() > 0.0001) {
          camera.position.addScaledVector(mobileVelocity, delta);
          orbitControls.target.addScaledVector(mobileVelocity, delta);

          camera.position.x = THREE.MathUtils.clamp(camera.position.x, -40, 40);
          camera.position.z = THREE.MathUtils.clamp(camera.position.z, -40, 40);
          orbitControls.target.x = THREE.MathUtils.clamp(orbitControls.target.x, -40, 40);
          orbitControls.target.z = THREE.MathUtils.clamp(orbitControls.target.z, -40, 40);
        }
      }

      orbitControls?.update();

      const observerPosition = pointerControls?.object.position ?? camera.position;
      syncPlantFocus(observerPosition);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return {
      setMobileMove: (direction: GardenMoveDirection, active: boolean) => {
        moveState[direction] = active;
      },
      dispose: () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();

        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        canvas.removeEventListener('click', onCanvasClick);
        canvas.removeEventListener('click', onSingleClickPick);
        canvas.removeEventListener('dblclick', onDoubleClick);

        orbitControls?.dispose();
        pointerControls?.disconnect();

        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
          if (child instanceof THREE.Sprite) {
            child.material.map?.dispose();
            child.material.dispose();
          }
        });

        disposableTextures.forEach((texture) => texture.dispose());
        renderer.dispose();
      }
    };
  }

  private createPlants(plants: Plant[], fullScreen: boolean): GardenPlantMesh[] {
    if (!fullScreen) {
      return this.createPreviewPlants();
    }

    const sourcePlants = plants.length ? plants : this.createFallbackPlants();
    const layout = this.createGardenLayout(sourcePlants.length);

    return sourcePlants.map((plant, index) => {
      const { group, swayNodes, selectableMeshes, labelHeight, focusHeight } = this.createDetailedPlant(
        plant,
        index
      );
      const position = layout[index];
      group.position.copy(position);

      const nameTag = this.createNameTag(plant.commonName);
      nameTag.position.set(0, labelHeight, 0);
      group.add(nameTag);

      group.add(this.createPlantBed(index));

      selectableMeshes.forEach((mesh) => {
        mesh.userData['plantId'] = plant.id;
      });

      return {
        info: plant,
        group,
        swayNodes,
        anchor: position.clone().add(new THREE.Vector3(0, focusHeight, 0)),
        selectableMeshes
      };
    });
  }

  private createFallbackPlants(): Plant[] {
    return [
      {
        id: 'fallback-tulsi',
        commonName: 'Tulsi',
        scientificName: 'Ocimum sanctum',
        category: 'Ayurvedic',
        imageUrl: '',
        shortDescription: '',
        description: 'Traditional medicinal herb in immersive garden.',
        foundIn: [],
        medicinalUses: ['Immune support']
      },
      {
        id: 'fallback-neem',
        commonName: 'Neem',
        scientificName: 'Azadirachta indica',
        category: 'Trees',
        imageUrl: '',
        shortDescription: '',
        description: 'Medicinal tree known for antibacterial support.',
        foundIn: [],
        medicinalUses: ['Skin support']
      },
      {
        id: 'fallback-aloe',
        commonName: 'Aloe Vera',
        scientificName: 'Aloe barbadensis',
        category: 'Herbs',
        imageUrl: '',
        shortDescription: '',
        description: 'Soothing herb for skin comfort.',
        foundIn: [],
        medicinalUses: ['Soothing support']
      }
    ];
  }

  private createPreviewPlants(): GardenPlantMesh[] {
    const demoPlants = this.createFallbackPlants();
    const positions = [
      new THREE.Vector3(-2.2, 0, -1.2),
      new THREE.Vector3(0, 0, 0.6),
      new THREE.Vector3(2.1, 0, -0.4)
    ];

    return demoPlants.map((plant, index) => {
      const { group, swayNodes, selectableMeshes, focusHeight } = this.createDetailedPlant(plant, index);
      const position = positions[index];
      group.position.copy(position);
      group.scale.setScalar(0.78);

      selectableMeshes.forEach((mesh) => {
        mesh.userData['plantId'] = plant.id;
      });

      return {
        info: plant,
        group,
        swayNodes,
        anchor: position.clone().add(new THREE.Vector3(0, focusHeight * 0.78, 0)),
        selectableMeshes
      };
    });
  }

  private createGardenLayout(count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];

    for (let index = 0; index < count; index += 1) {
      const ring = Math.floor(index / 8) + 1;
      const slot = index % 8;
      const radius = 6 + ring * 5.5;
      const angle = (slot / 8) * Math.PI * 2 + ring * 0.28;

      positions.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    return positions;
  }

  private createGardenDetails(fullScreen: boolean): THREE.Group {
    const group = new THREE.Group();

    const grassField = this.createGrassField(fullScreen ? 43 : 7.2, fullScreen ? 950 : 140, fullScreen);
    group.add(grassField);

    if (!fullScreen) {
      return group;
    }

    const rand = this.seededRandom(407);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#8e9484', roughness: 0.98 });
    for (let index = 0; index < 34; index += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = 14.8 + rand() * 1.1;
      const rock = new THREE.Mesh(new THREE.SphereGeometry(0.14 + rand() * 0.16, 12, 8), rockMaterial);
      rock.position.set(Math.cos(angle) * radius, 0.07, Math.sin(angle) * radius);
      rock.scale.set(1.4 + rand() * 0.8, 0.42 + rand() * 0.18, 0.8 + rand() * 0.5);
      rock.rotation.y = rand() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }

    const shrubMaterials = ['#315f34', '#3f7c3e', '#527a37'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
    );
    for (let index = 0; index < 32; index += 1) {
      const angle = (index / 32) * Math.PI * 2 + rand() * 0.06;
      const radius = 39.5 + rand() * 3.4;
      const shrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 + rand() * 0.45, 18, 12),
        shrubMaterials[index % shrubMaterials.length]
      );
      shrub.position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
      shrub.scale.set(1.35, 0.68 + rand() * 0.25, 1);
      shrub.castShadow = true;
      shrub.receiveShadow = true;
      group.add(shrub);
    }

    return group;
  }

  private createGrassField(radius: number, count: number, fullScreen: boolean): THREE.InstancedMesh {
    const geometry = new THREE.PlaneGeometry(0.08, 0.62, 1, 3);
    geometry.translate(0, 0.31, 0);

    const material = new THREE.MeshStandardMaterial({
      color: '#6eb05c',
      roughness: 0.92,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    const rand = this.seededRandom(fullScreen ? 911 : 129);
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 8) {
      attempts += 1;
      const distance = Math.sqrt(rand()) * radius;
      const angle = rand() * Math.PI * 2;

      if (fullScreen && (distance < 7.1 || (distance > 10.2 && distance < 15.4))) {
        continue;
      }

      const scale = 0.55 + rand() * 0.95;
      dummy.position.set(Math.cos(angle) * distance, 0.018, Math.sin(angle) * distance);
      dummy.rotation.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.28);
      dummy.scale.set(scale, scale * (0.85 + rand() * 0.4), scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed += 1;
    }

    mesh.count = placed;
    mesh.frustumCulled = false;
    return mesh;
  }

  private createDetailedPlant(plant: Plant, seed: number): PlantModelResult {
    const id = plant.id.toLowerCase();
    const rand = this.seededRandom(this.hashText(`${plant.id}-${plant.commonName}-${seed}`));

    if (plant.category === 'Trees') {
      return this.createTreePlant(plant, seed, rand);
    }
    if (id.includes('aloe')) {
      return this.createSucculentPlant(rand);
    }
    if (id.includes('lemongrass')) {
      return this.createGrassHerbPlant(rand);
    }
    if (id.includes('turmeric') || id.includes('ginger')) {
      return this.createBroadLeafHerbPlant(id, rand);
    }

    return this.createLeafyMedicinalPlant(id, rand);
  }

  private createTreePlant(plant: Plant, seed: number, rand: () => number): PlantModelResult {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];
    const isMoringa = plant.id.includes('moringa');
    const isAmla = plant.id.includes('amla');

    const trunkHeight = 2.75 + rand() * 0.55 + (isMoringa ? 0.35 : 0);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#76533a', roughness: 0.93 });
    const branchMaterial = new THREE.MeshStandardMaterial({ color: '#6a4932', roughness: 0.94 });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.36, trunkHeight, 18, 5),
      trunkMaterial
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    selectableMeshes.push(trunk);

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + rand() * 0.35 + seed * 0.08;
      const branchStart = new THREE.Vector3(0, trunkHeight * (0.54 + rand() * 0.22), 0);
      const reach = 0.95 + rand() * 0.55;
      const branchEnd = new THREE.Vector3(
        Math.cos(angle) * reach,
        branchStart.y + 0.42 + rand() * 0.42,
        Math.sin(angle) * reach
      );
      const branch = this.createCylinderBetween(branchStart, branchEnd, 0.045, 0.095, branchMaterial, 10);
      branch.castShadow = true;
      group.add(branch);
      selectableMeshes.push(branch);
    }

    const canopy = new THREE.Group();
    canopy.position.y = trunkHeight + 0.52;
    const canopyMaterials = ['#2f7d36', '#3e9142', '#67a84a', '#285f31'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
    );

    for (let index = 0; index < 10; index += 1) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.62 + rand() * 0.35, 24, 18),
        canopyMaterials[index % canopyMaterials.length]
      );
      sphere.position.set((rand() - 0.5) * 2.2, (rand() - 0.32) * 1.35, (rand() - 0.5) * 2.15);
      sphere.scale.set(1.12 + rand() * 0.35, 0.86 + rand() * 0.28, 1.08 + rand() * 0.34);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      canopy.add(sphere);
      selectableMeshes.push(sphere);
    }

    const leafMaterial = new THREE.MeshStandardMaterial({
      color: isMoringa ? '#6fa83e' : '#4c9b45',
      roughness: 0.78,
      side: THREE.DoubleSide
    });
    for (let index = 0; index < 20; index += 1) {
      const leaf = this.createLeafMesh(0.36 + rand() * 0.16, 0.14 + rand() * 0.05, leafMaterial);
      leaf.position.set((rand() - 0.5) * 2.8, (rand() - 0.15) * 1.7, (rand() - 0.5) * 2.65);
      leaf.rotation.set(rand() * 0.7, rand() * Math.PI * 2, (rand() - 0.5) * 0.9);
      canopy.add(leaf);
      selectableMeshes.push(leaf);
    }

    if (isAmla) {
      const fruitMaterial = new THREE.MeshStandardMaterial({ color: '#b7c45b', roughness: 0.6 });
      for (let index = 0; index < 14; index += 1) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), fruitMaterial);
        fruit.position.set((rand() - 0.5) * 2.35, (rand() - 0.25) * 1.4, (rand() - 0.5) * 2.2);
        fruit.castShadow = true;
        canopy.add(fruit);
        selectableMeshes.push(fruit);
      }
    } else if (isMoringa) {
      const podMaterial = new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 0.78 });
      for (let index = 0; index < 7; index += 1) {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85 + rand() * 0.35, 8), podMaterial);
        pod.position.set((rand() - 0.5) * 2.0, (rand() - 0.22) * 1.2, (rand() - 0.5) * 2.0);
        pod.rotation.set(0.6 + rand() * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.6);
        pod.castShadow = true;
        canopy.add(pod);
        selectableMeshes.push(pod);
      }
    }

    this.registerSway(canopy, rand, 0.035, 0.9);
    swayNodes.push(canopy);
    group.add(canopy);

    return {
      group,
      swayNodes,
      selectableMeshes,
      labelHeight: trunkHeight + 2.55,
      focusHeight: trunkHeight + 1.15
    };
  }

  private createSucculentPlant(rand: () => number): PlantModelResult {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];
    const leafMaterials = ['#5fae75', '#77bd85', '#4e9366'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 })
    );
    const rosette = new THREE.Group();

    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const innerRing = index >= 16;
      const length = innerRing ? 0.95 + rand() * 0.35 : 1.35 + rand() * 0.35;
      const width = innerRing ? 0.12 + rand() * 0.04 : 0.18 + rand() * 0.05;
      const base = new THREE.Vector3(Math.cos(angle) * 0.08, 0.16, Math.sin(angle) * 0.08);
      const direction = new THREE.Vector3(
        Math.cos(angle) * (innerRing ? 0.42 : 0.76),
        innerRing ? 0.9 : 0.58,
        Math.sin(angle) * (innerRing ? 0.42 : 0.76)
      ).normalize();
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(width, length, 9, 3, false),
        leafMaterials[index % leafMaterials.length]
      );
      leaf.position.copy(base).addScaledVector(direction, length / 2);
      leaf.quaternion.setFromUnitVectors(this.upVector, direction);
      leaf.scale.set(1, 1, 0.24);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      rosette.add(leaf);
      selectableMeshes.push(leaf);
    }

    const heart = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 18, 12),
      new THREE.MeshStandardMaterial({ color: '#a7d99a', roughness: 0.75 })
    );
    heart.position.y = 0.55;
    heart.scale.set(1, 0.7, 1);
    heart.castShadow = true;
    rosette.add(heart);
    selectableMeshes.push(heart);

    this.registerSway(rosette, rand, 0.018, 0.82);
    swayNodes.push(rosette);
    group.add(rosette);

    return { group, swayNodes, selectableMeshes, labelHeight: 2.25, focusHeight: 1.1 };
  }

  private createGrassHerbPlant(rand: () => number): PlantModelResult {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: '#7da84d',
      roughness: 0.86,
      side: THREE.DoubleSide
    });
    const cluster = new THREE.Group();

    for (let index = 0; index < 32; index += 1) {
      const angle = (index / 32) * Math.PI * 2 + rand() * 0.12;
      const length = 1.25 + rand() * 0.95;
      const width = 0.075 + rand() * 0.04;
      const blade = this.createLeafMesh(length, width, bladeMaterial);
      blade.position.set(Math.cos(angle) * (0.12 + rand() * 0.18), length / 2, Math.sin(angle) * (0.12 + rand() * 0.18));
      blade.rotation.set((rand() - 0.5) * 0.16, angle, (rand() - 0.5) * 0.82);
      blade.castShadow = true;
      cluster.add(blade);
      selectableMeshes.push(blade);
    }

    const flowerMaterial = new THREE.MeshStandardMaterial({ color: '#d8c27a', roughness: 0.72 });
    for (let index = 0; index < 6; index += 1) {
      const angle = rand() * Math.PI * 2;
      const stemHeight = 1.65 + rand() * 0.5;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.024, stemHeight, 6),
        new THREE.MeshStandardMaterial({ color: '#6d883f', roughness: 0.9 })
      );
      stem.position.set(Math.cos(angle) * 0.22, stemHeight / 2, Math.sin(angle) * 0.22);
      stem.castShadow = true;
      cluster.add(stem);
      selectableMeshes.push(stem);

      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 8), flowerMaterial);
      plume.position.set(stem.position.x, stemHeight + 0.18, stem.position.z);
      plume.rotation.z = (rand() - 0.5) * 0.4;
      plume.castShadow = true;
      cluster.add(plume);
      selectableMeshes.push(plume);
    }

    this.registerSway(cluster, rand, 0.075, 1.22);
    swayNodes.push(cluster);
    group.add(cluster);

    return { group, swayNodes, selectableMeshes, labelHeight: 2.9, focusHeight: 1.55 };
  }

  private createBroadLeafHerbPlant(id: string, rand: () => number): PlantModelResult {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];
    const plantGroup = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#6f8c3c', roughness: 0.86 });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: id.includes('turmeric') ? '#4b9c4a' : '#5b9a42',
      roughness: 0.76,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2 + rand() * 0.25;
      const radius = rand() * 0.34;
      const height = 1.05 + rand() * 0.62;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, height, 10), stemMaterial);
      stem.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      stem.castShadow = true;
      plantGroup.add(stem);
      selectableMeshes.push(stem);

      for (let leafIndex = 0; leafIndex < 2; leafIndex += 1) {
        const leaf = this.createLeafMesh(0.82 + rand() * 0.28, 0.34 + rand() * 0.12, leafMaterial);
        leaf.position.set(
          stem.position.x + Math.cos(angle + leafIndex * Math.PI) * 0.16,
          height + 0.12 + leafIndex * 0.18,
          stem.position.z + Math.sin(angle + leafIndex * Math.PI) * 0.16
        );
        leaf.rotation.set(0.88 + rand() * 0.24, angle + leafIndex * Math.PI * 0.72, (rand() - 0.5) * 0.45);
        leaf.castShadow = true;
        plantGroup.add(leaf);
        selectableMeshes.push(leaf);
      }
    }

    const rhizomeMaterial = new THREE.MeshStandardMaterial({
      color: id.includes('turmeric') ? '#d99b32' : '#c89a58',
      roughness: 0.68
    });
    for (let index = 0; index < 5; index += 1) {
      const rhizome = new THREE.Mesh(new THREE.SphereGeometry(0.16 + rand() * 0.07, 16, 10), rhizomeMaterial);
      rhizome.position.set((rand() - 0.5) * 0.8, 0.18, (rand() - 0.5) * 0.55);
      rhizome.scale.set(1.8 + rand() * 0.4, 0.62, 0.9 + rand() * 0.4);
      rhizome.rotation.y = rand() * Math.PI;
      rhizome.castShadow = true;
      plantGroup.add(rhizome);
      selectableMeshes.push(rhizome);
    }

    this.registerSway(plantGroup, rand, 0.045, 1.05);
    swayNodes.push(plantGroup);
    group.add(plantGroup);

    return { group, swayNodes, selectableMeshes, labelHeight: 2.85, focusHeight: 1.55 };
  }

  private createLeafyMedicinalPlant(id: string, rand: () => number): PlantModelResult {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#597639', roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: id.includes('brahmi') ? '#4f9f62' : '#438b43',
      roughness: 0.79,
      side: THREE.DoubleSide
    });
    const flowerColor = id.includes('ashwagandha') ? '#de8d4a' : id.includes('brahmi') ? '#b6c7ff' : '#c19bd7';
    const flowerMaterial = new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.58 });

    for (let index = 0; index < 12; index += 1) {
      const sprig = new THREE.Group();
      const angle = (index / 12) * Math.PI * 2 + rand() * 0.2;
      const baseRadius = rand() * 0.45;
      const height = 0.88 + rand() * 0.62;
      const lean = (rand() - 0.5) * 0.32;
      const stem = this.createCylinderBetween(
        new THREE.Vector3(0, 0.15, 0),
        new THREE.Vector3(lean, height, 0),
        0.025,
        0.045,
        stemMaterial,
        8
      );
      stem.castShadow = true;
      sprig.add(stem);
      selectableMeshes.push(stem);

      const leafPairs = 3 + Math.floor(rand() * 3);
      for (let leafIndex = 0; leafIndex < leafPairs; leafIndex += 1) {
        const y = 0.38 + (leafIndex / leafPairs) * (height - 0.32);
        const spread = 0.13 + leafIndex * 0.025;

        for (const side of [-1, 1]) {
          const leaf = this.createLeafMesh(0.3 + rand() * 0.14, 0.14 + rand() * 0.04, leafMaterial);
          leaf.position.set(side * spread + lean * (y / height), y, 0.015 * side);
          leaf.rotation.set(0.72 + rand() * 0.24, side > 0 ? 0.35 : Math.PI - 0.35, side * (0.45 + rand() * 0.3));
          leaf.castShadow = true;
          sprig.add(leaf);
          selectableMeshes.push(leaf);
        }
      }

      if (index % 3 === 0 || id.includes('ashwagandha')) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.07 + rand() * 0.025, 12, 8), flowerMaterial);
        flower.position.set(lean, height + 0.04, 0);
        flower.castShadow = true;
        sprig.add(flower);
        selectableMeshes.push(flower);
      }

      sprig.position.set(Math.cos(angle) * baseRadius, 0, Math.sin(angle) * baseRadius);
      sprig.rotation.y = angle;
      this.registerSway(sprig, rand, 0.055, 1.12);
      swayNodes.push(sprig);
      group.add(sprig);
    }

    return { group, swayNodes, selectableMeshes, labelHeight: 2.35, focusHeight: 1.24 };
  }

  private createPlantBed(seed: number): THREE.Group {
    const group = new THREE.Group();
    const rand = this.seededRandom(700 + seed * 31);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.52, 0.26, 44),
      new THREE.MeshStandardMaterial({ color: '#76543a', roughness: 0.96 })
    );
    soil.position.y = 0.11;
    soil.receiveShadow = true;
    group.add(soil);

    const stoneRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.47, 0.075, 8, 56),
      new THREE.MeshStandardMaterial({ color: '#a19782', roughness: 0.92 })
    );
    stoneRing.position.y = 0.25;
    stoneRing.rotation.x = Math.PI / 2;
    stoneRing.castShadow = true;
    stoneRing.receiveShadow = true;
    group.add(stoneRing);

    const pebbleMaterial = new THREE.MeshStandardMaterial({ color: '#b9af98', roughness: 0.95 });
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2 + rand() * 0.08;
      const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rand() * 0.04, 10, 7), pebbleMaterial);
      pebble.position.set(Math.cos(angle) * (1.38 + rand() * 0.11), 0.28, Math.sin(angle) * (1.38 + rand() * 0.11));
      pebble.scale.set(1.4 + rand() * 0.6, 0.45 + rand() * 0.2, 0.9 + rand() * 0.35);
      pebble.rotation.y = rand() * Math.PI;
      pebble.castShadow = true;
      pebble.receiveShadow = true;
      group.add(pebble);
    }

    return group;
  }

  private createCylinderBetween(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radiusTop: number,
    radiusBottom: number,
    material: THREE.Material,
    radialSegments: number
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments, 3),
      material
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(this.upVector, direction.normalize());
    return mesh;
  }

  private createLeafMesh(length: number, width: number, material: THREE.Material): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, length / 2);
    shape.bezierCurveTo(width / 2, length * 0.28, width / 2, -length * 0.28, 0, -length / 2);
    shape.bezierCurveTo(-width / 2, -length * 0.28, -width / 2, length * 0.28, 0, length / 2);

    const geometry = new THREE.ShapeGeometry(shape, 18);
    const leaf = new THREE.Mesh(geometry, material);
    leaf.castShadow = true;
    return leaf;
  }

  private registerSway(node: THREE.Object3D, rand: () => number, amplitude: number, speed: number) {
    node.userData['swayPhase'] = rand() * Math.PI * 2;
    node.userData['swayAmplitude'] = amplitude;
    node.userData['swaySpeed'] = speed + rand() * 0.28;
    node.userData['baseRotationX'] = node.rotation.x;
    node.userData['baseRotationZ'] = node.rotation.z;
  }

  private seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  private hashText(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private createNameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');

    if (context) {
      const gradient = context.createLinearGradient(8, 10, 248, 86);
      gradient.addColorStop(0, 'rgba(16, 61, 29, 0.92)');
      gradient.addColorStop(1, 'rgba(47, 93, 45, 0.86)');
      context.shadowColor = 'rgba(0, 0, 0, 0.22)';
      context.shadowBlur = 14;
      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(8, 10, 240, 76, 18);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(229, 255, 225, 0.32)';
      context.lineWidth = 2;
      context.stroke();

      let fontSize = 26;
      context.font = `700 ${fontSize}px Inter`;
      while (context.measureText(name).width > 205 && fontSize > 18) {
        fontSize -= 1;
        context.font = `700 ${fontSize}px Inter`;
      }
      context.fillStyle = '#f3fff4';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(name, 128, 48);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.5, 1.25, 1);
    return sprite;
  }

  private createCloudCluster(seed: number): THREE.Group {
    const cluster = new THREE.Group();
    const rand = this.seededRandom(seed);

    for (let index = 0; index < 5; index += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1.3 + rand() * 0.9, 20, 16),
        new THREE.MeshStandardMaterial({ color: '#f9feff', roughness: 0.98, metalness: 0 })
      );
      puff.position.set((rand() - 0.5) * 5, (rand() - 0.5) * 0.7, (rand() - 0.5) * 2.5);
      cluster.add(puff);
    }

    return cluster;
  }

  private createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext('2d');
    if (!context) {
      return new THREE.CanvasTexture(canvas);
    }

    context.fillStyle = '#5f9d63';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const rand = this.seededRandom(211);
    for (let index = 0; index < 700; index += 1) {
      const x = rand() * canvas.width;
      const y = rand() * canvas.height;
      const length = 3 + rand() * 8;

      context.strokeStyle = rand() > 0.5 ? '#6abf69' : '#417f46';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (rand() - 0.5) * 2, y - length);
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPathTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext('2d');
    if (!context) {
      return new THREE.CanvasTexture(canvas);
    }

    context.fillStyle = '#ceb89a';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const rand = this.seededRandom(313);
    for (let index = 0; index < 320; index += 1) {
      const x = rand() * canvas.width;
      const y = rand() * canvas.height;
      const radius = 1 + rand() * 2;
      context.fillStyle = rand() > 0.5 ? '#c3ab8c' : '#baa485';
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
