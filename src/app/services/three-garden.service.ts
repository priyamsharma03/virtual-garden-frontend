import { Injectable } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

export interface SceneHandle {
  dispose: () => void;
}

interface SceneOptions {
  fullScreen: boolean;
  controls: boolean;
}

interface PlantMesh {
  group: THREE.Group;
  leaves: THREE.Mesh;
}

@Injectable({
  providedIn: 'root'
})
export class ThreeGardenService {
  initPreview(canvas: HTMLCanvasElement): SceneHandle {
    return this.buildScene(canvas, { fullScreen: false, controls: false });
  }

  initFullGarden(canvas: HTMLCanvasElement): SceneHandle {
    return this.buildScene(canvas, { fullScreen: true, controls: true });
  }

  private buildScene(canvas: HTMLCanvasElement, options: SceneOptions): SceneHandle {
    const scene = new THREE.Scene();
    if (options.fullScreen) {
      scene.background = new THREE.Color('#d7ead1');
    }

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(7, 6, 9);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: !options.fullScreen
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x6d4c41, 1.1);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(8, 14, 6);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const grassTexture = this.createGrassTexture();
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(6, 6);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(options.fullScreen ? 18 : 8, 64),
      new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 1,
        metalness: 0
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const plants = this.createPlants(options.fullScreen);
    plants.forEach((plant) => scene.add(plant.group));

    const controls = options.controls ? new OrbitControls(camera, renderer.domElement) : undefined;
    if (controls) {
      controls.enableDamping = true;
      controls.minDistance = 5;
      controls.maxDistance = 22;
      controls.maxPolarAngle = Math.PI / 2.05;
    }

    const clock = new THREE.Clock();
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
      const elapsed = clock.getElapsedTime();
      plants.forEach((plant, index) => {
        // A tiny sinusoidal sway gives a lightweight wind effect.
        plant.group.rotation.z = Math.sin(elapsed * 1.8 + index) * 0.04;
        plant.leaves.rotation.y += 0.01;
      });

      if (controls) {
        controls.update();
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return {
      dispose: () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        controls?.dispose();

        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });

        grassTexture.dispose();
        renderer.dispose();
      }
    };
  }

  private createPlants(fullScreen: boolean): PlantMesh[] {
    const positions = fullScreen
      ? [
          { x: -6, z: -3, h: 1.8 },
          { x: -2, z: 4, h: 1.5 },
          { x: 2, z: -2, h: 1.7 },
          { x: 5, z: 3, h: 2.2 },
          { x: 0, z: 0, h: 1.4 }
        ]
      : [
          { x: -2.2, z: -1.2, h: 1.1 },
          { x: 0, z: 0.7, h: 1.3 },
          { x: 2.1, z: -0.4, h: 1.2 }
        ];

    return positions.map((position) => {
      const group = new THREE.Group();
      group.position.set(position.x, 0, position.z);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.22, position.h, 10),
        new THREE.MeshStandardMaterial({ color: '#6d4c41', roughness: 0.95 })
      );
      trunk.position.y = position.h / 2;
      trunk.castShadow = true;
      group.add(trunk);

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.7, 12),
        new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.8 })
      );
      leaves.position.y = position.h + 0.8;
      leaves.castShadow = true;
      group.add(leaves);

      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#81c784', roughness: 0.45 })
      );
      flower.position.y = position.h + 1.25;
      group.add(flower);

      return { group, leaves };
    });
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

    for (let i = 0; i < 700; i += 1) {
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
}
