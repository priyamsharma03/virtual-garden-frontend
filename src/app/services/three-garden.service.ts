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

@Injectable({
  providedIn: 'root'
})
export class ThreeGardenService {
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
    scene.background = new THREE.Color(options.fullScreen ? '#d7ead1' : '#e8f2e0');
    scene.fog = options.fullScreen ? new THREE.Fog('#d7ead1', 24, 95) : null;

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 140);
    camera.position.set(7, options.fullScreen ? 1.8 : 6, options.fullScreen ? 18 : 9);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: !options.fullScreen
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const hemisphereLight = new THREE.HemisphereLight(0xf2ffe9, 0x6d4c41, 1.08);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.25);
    directionalLight.position.set(14, 18, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    scene.add(directionalLight);

    const fillLight = new THREE.PointLight('#c8f3ca', 0.6, 60);
    fillLight.position.set(-10, 8, -8);
    scene.add(fillLight);

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 20),
      new THREE.MeshBasicMaterial({
        color: '#cfe8ff',
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

    const onDoubleClick = (event: MouseEvent) => {
      if (!selectableMeshes.length) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(selectableMeshes, false);
      const id = intersects[0]?.object.userData['plantId'];

      if (typeof id === 'string') {
        selectedPlantId = id;
      }
    };

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
          medicinalUses: activePlant.info.medicinalUses,
          distance: activeDistance
        });
      }
    };

    const cloudCluster = this.createCloudCluster();
    cloudCluster.position.set(-12, 18, -15);
    scene.add(cloudCluster);

    const cloudClusterB = this.createCloudCluster();
    cloudClusterB.position.set(18, 15, 10);
    cloudClusterB.scale.setScalar(0.8);
    scene.add(cloudClusterB);

    const disposableTextures: THREE.Texture[] = [grassTexture, pathTexture];
    const clock = new THREE.Clock();
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
      const delta = clock.getDelta();
      elapsed += delta;

      plants.forEach((plant, index) => {
        plant.swayNodes.forEach((node, swayIndex) => {
          node.rotation.z = Math.sin(elapsed * 1.7 + index * 0.5 + swayIndex * 0.3) * 0.06;
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
        const movementSpeed = 7.5;
        const xDirection = Number(keyState.KeyD) - Number(keyState.KeyA);
        const zDirection = Number(keyState.KeyW) - Number(keyState.KeyS);

        if (zDirection !== 0) {
          pointerControls.moveForward(zDirection * movementSpeed * delta);
        }
        if (xDirection !== 0) {
          pointerControls.moveRight(xDirection * movementSpeed * delta);
        }

        const walker = pointerControls.object;
        walker.position.y = 1.75;
        walker.position.x = THREE.MathUtils.clamp(walker.position.x, -40, 40);
        walker.position.z = THREE.MathUtils.clamp(walker.position.z, -40, 40);
      }

      if (useMobileButtonMovement && orbitControls) {
        const directionStrength =
          Number(moveState.forward) +
          Number(moveState.backward) +
          Number(moveState.left) +
          Number(moveState.right);

        if (directionStrength > 0) {
          const moveSpeed = 6.4;
          const forward = new THREE.Vector3().subVectors(orbitControls.target, camera.position);
          forward.y = 0;

          if (forward.lengthSq() > 0.0001) {
            forward.normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            const moveVector = new THREE.Vector3();
            if (moveState.forward) {
              moveVector.add(forward);
            }
            if (moveState.backward) {
              moveVector.sub(forward);
            }
            if (moveState.right) {
              moveVector.add(right);
            }
            if (moveState.left) {
              moveVector.sub(right);
            }

            if (moveVector.lengthSq() > 0.0001) {
              moveVector.normalize().multiplyScalar(moveSpeed * delta);
              camera.position.add(moveVector);
              orbitControls.target.add(moveVector);

              camera.position.x = THREE.MathUtils.clamp(camera.position.x, -40, 40);
              camera.position.z = THREE.MathUtils.clamp(camera.position.z, -40, 40);
              orbitControls.target.x = THREE.MathUtils.clamp(orbitControls.target.x, -40, 40);
              orbitControls.target.z = THREE.MathUtils.clamp(orbitControls.target.z, -40, 40);
            }
          }
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
      const { group, swayNodes, selectableMeshes } = this.createDetailedPlant(plant, index);
      const position = layout[index];
      group.position.copy(position);

      const nameTag = this.createNameTag(plant.commonName);
      nameTag.position.set(0, 2.9, 0);
      group.add(nameTag);

      const bed = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.45, 0.34, 28),
        new THREE.MeshStandardMaterial({ color: '#8f6d50', roughness: 0.95 })
      );
      bed.position.y = 0.16;
      bed.receiveShadow = true;
      group.add(bed);

      selectableMeshes.forEach((mesh) => {
        mesh.userData['plantId'] = plant.id;
      });

      return {
        info: plant,
        group,
        swayNodes,
        anchor: position.clone().add(new THREE.Vector3(0, 1.9, 0)),
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
      const { group, swayNodes, selectableMeshes } = this.createDetailedPlant(plant, index);
      const position = positions[index];
      group.position.copy(position);

      selectableMeshes.forEach((mesh) => {
        mesh.userData['plantId'] = plant.id;
      });

      return {
        info: plant,
        group,
        swayNodes,
        anchor: position.clone().add(new THREE.Vector3(0, 1.7, 0)),
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

  private createDetailedPlant(plant: Plant, seed: number): {
    group: THREE.Group;
    swayNodes: THREE.Object3D[];
    selectableMeshes: THREE.Mesh[];
  } {
    const group = new THREE.Group();
    const swayNodes: THREE.Object3D[] = [];
    const selectableMeshes: THREE.Mesh[] = [];

    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#6d4c41', roughness: 0.95 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.78 });

    if (plant.category === 'Trees') {
      const trunkHeight = 2.1 + (seed % 3) * 0.35;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 12), stemMaterial);
      trunk.position.y = trunkHeight / 2;
      trunk.castShadow = true;
      group.add(trunk);
      selectableMeshes.push(trunk);

      const canopy = new THREE.Group();
      canopy.position.y = trunkHeight + 0.65;
      const canopyColors = ['#2e7d32', '#388e3c', '#4caf50'];

      for (let index = 0; index < 6; index += 1) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.7 + (index % 2) * 0.2, 18, 14),
          new THREE.MeshStandardMaterial({ color: canopyColors[index % canopyColors.length], roughness: 0.8 })
        );
        sphere.position.set((Math.random() - 0.5) * 1.6, Math.random() * 1.1, (Math.random() - 0.5) * 1.6);
        sphere.castShadow = true;
        canopy.add(sphere);
        selectableMeshes.push(sphere);
      }

      swayNodes.push(canopy);
      group.add(canopy);
    } else if (plant.category === 'Herbs') {
      for (let index = 0; index < 9; index += 1) {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.07, 0.9 + Math.random() * 0.35, 8),
          new THREE.MeshStandardMaterial({ color: '#5b7f39', roughness: 0.92 })
        );
        stem.position.set((Math.random() - 0.5) * 0.9, 0.45, (Math.random() - 0.5) * 0.9);
        stem.castShadow = true;
        group.add(stem);
        selectableMeshes.push(stem);

        const leafCluster = new THREE.Group();
        leafCluster.position.copy(stem.position).add(new THREE.Vector3(0, 0.5, 0));

        for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.48), leafMaterial);
          leaf.position.set((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25);
          leaf.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
          leaf.castShadow = true;
          leafCluster.add(leaf);
          selectableMeshes.push(leaf);
        }

        swayNodes.push(leafCluster);
        group.add(leafCluster);
      }
    } else {
      const bush = new THREE.Group();

      for (let index = 0; index < 7; index += 1) {
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.08, 1.1 + Math.random() * 0.3, 8),
          new THREE.MeshStandardMaterial({ color: '#6b7b2f', roughness: 0.9 })
        );
        stalk.position.set((Math.random() - 0.5) * 0.8, 0.55, (Math.random() - 0.5) * 0.8);
        stalk.castShadow = true;
        bush.add(stalk);
        selectableMeshes.push(stalk);

        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshStandardMaterial({ color: '#a5d6a7', roughness: 0.42 })
        );
        flower.position.copy(stalk.position).add(new THREE.Vector3(0, 0.55, 0));
        flower.castShadow = true;
        bush.add(flower);
        selectableMeshes.push(flower);
      }

      const baseLeaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 20, 14),
        new THREE.MeshStandardMaterial({ color: '#2f8a3b', roughness: 0.86 })
      );
      baseLeaves.position.y = 0.8;
      baseLeaves.scale.set(1, 0.75, 1);
      baseLeaves.castShadow = true;
      bush.add(baseLeaves);
      selectableMeshes.push(baseLeaves);

      swayNodes.push(bush);
      group.add(bush);
    }

    return { group, swayNodes, selectableMeshes };
  }

  private createNameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');

    if (context) {
      context.fillStyle = 'rgba(17, 58, 27, 0.82)';
      context.fillRect(8, 10, 240, 76);
      context.fillStyle = '#f3fff4';
      context.font = '600 26px Inter';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(name, 128, 48);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.6, 1.35, 1);
    return sprite;
  }

  private createCloudCluster(): THREE.Group {
    const cluster = new THREE.Group();

    for (let index = 0; index < 5; index += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1.3 + Math.random() * 0.9, 18, 18),
        new THREE.MeshStandardMaterial({ color: '#f9feff', roughness: 0.98, metalness: 0 })
      );
      puff.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 2.5);
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

    for (let index = 0; index < 700; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const length = 3 + Math.random() * 8;

      context.strokeStyle = Math.random() > 0.5 ? '#6abf69' : '#417f46';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (Math.random() - 0.5) * 2, y - length);
      context.stroke();
    }

    return new THREE.CanvasTexture(canvas);
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

    for (let index = 0; index < 320; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 1 + Math.random() * 2;
      context.fillStyle = Math.random() > 0.5 ? '#c3ab8c' : '#baa485';
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }
}
