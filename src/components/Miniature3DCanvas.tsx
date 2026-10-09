import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { 
  RotateCw, RotateCcw, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, Sparkles, Sliders, Box, Layers, Eye
} from "lucide-react";

interface Miniature3DCanvasProps {
  imageUrl?: string;
  modelUrl?: string;
  name?: string;
  height?: number;
  autoRotate?: boolean;
  baseTheme?: "obsidian" | "gold" | "stone" | "bronze";
  className?: string;
}

const BASE_COLORS = {
  obsidian: { base: 0x18181b, rim: 0xf59e0b, emissive: 0x78350f, metalness: 0.8, roughness: 0.3 },
  gold: { base: 0x78350f, rim: 0xfbbf24, emissive: 0xd97706, metalness: 0.9, roughness: 0.2 },
  stone: { base: 0x3f3f46, rim: 0x38bdf8, emissive: 0x0369a1, metalness: 0.2, roughness: 0.8 },
  bronze: { base: 0x451a03, rim: 0xf97316, emissive: 0x9a3412, metalness: 0.7, roughness: 0.4 },
};

export function Miniature3DCanvas({
  imageUrl,
  modelUrl,
  name = "Miniatura 3D",
  height = 380,
  autoRotate: initialAutoRotate = true,
  baseTheme = "obsidian",
  className = "",
}: Miniature3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(initialAutoRotate);
  const [theme, setTheme] = useState(baseTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Three.js object references for runtime controls
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pedestalRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setLoading(true);
    setLoadError(null);

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 400;
    const currentHeight = isFullscreen ? window.innerHeight : height;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / currentHeight, 0.1, 100);
    camera.position.set(0, 2.2, 4.6);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, currentHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    mount.replaceChildren(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.08; // Allow slightly below horizon but not under table
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 2.2;
    controls.target.set(0, 1.1, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    mainLight.position.set(3, 6, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x7090ff, 1.6);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 1.5, 6);
    fillLight.position.set(0, 0.4, 2);
    scene.add(fillLight);

    // 6. Pedestal / Tabletop Base Group
    const pedestalGroup = new THREE.Group();
    pedestalRef.current = pedestalGroup;
    scene.add(pedestalGroup);

    const colorConfig = BASE_COLORS[theme] || BASE_COLORS.obsidian;

    // Bottom Base Tier
    const baseGeo = new THREE.CylinderGeometry(1.65, 1.8, 0.28, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: colorConfig.base,
      roughness: colorConfig.roughness,
      metalness: colorConfig.metalness,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.14;
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // Glowing Inner Ring / Runes
    const ringGeo = new THREE.RingGeometry(1.2, 1.45, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: colorConfig.rim,
      emissive: colorConfig.emissive,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.285;
    pedestalGroup.add(ringMesh);

    // Top Platform disc
    const topGeo = new THREE.CylinderGeometry(1.15, 1.2, 0.08, 48);
    const topMat = new THREE.MeshStandardMaterial({
      color: colorConfig.base,
      roughness: colorConfig.roughness + 0.1,
      metalness: colorConfig.metalness,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.32;
    topMesh.receiveShadow = true;
    pedestalGroup.add(topMesh);

    // 7. Load 3D Model OR Standee Figurine
    let figureObject: THREE.Object3D | null = null;

    const finalizeFigure = (obj: THREE.Object3D) => {
      figureObject = obj;
      scene.add(obj);
      setLoading(false);
    };

    if (modelUrl && modelUrl.endsWith(".glb") || (modelUrl && modelUrl.endsWith(".gltf"))) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          // Compute bounding box to auto-center & scale
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.0 / maxDim;
          model.scale.set(scale, scale, scale);

          const newBox = new THREE.Box3().setFromObject(model);
          model.position.y = 0.36 - newBox.min.y;
          model.position.x = -(newBox.min.x + newBox.max.x) / 2;
          model.position.z = -(newBox.min.z + newBox.max.z) / 2;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          finalizeFigure(model);
        },
        undefined,
        (err) => {
          console.error("Error loading GLTF model:", err);
          setLoadError("No se pudo cargar el modelo 3D. Cargando vista figurín...");
          loadStandee();
        }
      );
    } else if (modelUrl && modelUrl.endsWith(".stl")) {
      const loader = new STLLoader();
      loader.load(
        modelUrl,
        (geometry) => {
          geometry.computeVertexNormals();
          geometry.center();
          const material = new THREE.MeshStandardMaterial({
            color: 0x9ca3af, // Grey resin 3D print look
            roughness: 0.4,
            metalness: 0.1,
          });
          const mesh = new THREE.Mesh(geometry, material);
          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const size = new THREE.Vector3();
          box.getSize(size);
          const scale = 2.0 / (size.y || 1);
          mesh.scale.set(scale, scale, scale);
          mesh.position.y = 0.36 + (size.y * scale) / 2;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          finalizeFigure(mesh);
        },
        undefined,
        (err) => {
          console.error("Error loading STL:", err);
          loadStandee();
        }
      );
    } else {
      loadStandee();
    }

    function loadStandee() {
      // Create high-fidelity double-sided 3D Miniature Standee on the pedestal
      const textureUrl = imageUrl || "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop";
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        textureUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const figGroup = new THREE.Group();

          // Calculate aspect ratio
          const aspect = texture.image.width / (texture.image.height || 1);
          const figHeight = 2.0;
          const figWidth = Math.max(1.0, Math.min(2.0, figHeight * aspect));

          // Front and Back Standee Plane
          const planeGeo = new THREE.PlaneGeometry(figWidth, figHeight);
          const planeMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.1,
          });

          const planeMesh = new THREE.Mesh(planeGeo, planeMat);
          planeMesh.position.y = 0.36 + figHeight / 2;
          planeMesh.castShadow = true;
          figGroup.add(planeMesh);

          // Subtle acrylic backing slab for real 3D presence
          const slabGeo = new THREE.BoxGeometry(figWidth * 0.95, figHeight * 0.98, 0.04);
          const slabMat = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            roughness: 0.2,
            transmission: 0.6,
            thickness: 0.1,
          });
          const slabMesh = new THREE.Mesh(slabGeo, slabMat);
          slabMesh.position.y = 0.36 + figHeight / 2;
          slabMesh.position.z = -0.01;
          figGroup.add(slabMesh);

          // Foot pin / bracket attaching miniature to pedestal
          const pinGeo = new THREE.BoxGeometry(figWidth * 0.4, 0.12, 0.16);
          const pinMat = new THREE.MeshStandardMaterial({
            color: colorConfig.base,
            metalness: 0.8,
            roughness: 0.3,
          });
          const pinMesh = new THREE.Mesh(pinGeo, pinMat);
          pinMesh.position.y = 0.38;
          figGroup.add(pinMesh);

          finalizeFigure(figGroup);
        },
        undefined,
        (err) => {
          console.error("Texture error:", err);
          setLoading(false);
          setLoadError("No se pudo cargar la imagen de la miniatura.");
        }
      );
    }

    // 8. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 400;
      const h = isFullscreen ? window.innerHeight : height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      mount.replaceChildren();
    };
  }, [imageUrl, modelUrl, height, theme, isFullscreen]);

  // Sync auto-rotation state with controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 2.2, 4.6);
      controlsRef.current.target.set(0, 1.1, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (delta: number) => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, delta);
      controlsRef.current.update();
    }
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-radial from-zinc-900 via-zinc-950 to-black shadow-2xl select-none group ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""
      } ${className}`}
      style={{ height: isFullscreen ? "100vh" : `${height}px` }}
    >
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-0" 
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-spin">
            <RotateCw className="h-6 w-6" />
          </div>
          <span className="text-xs font-bold text-amber-300 mt-3 font-heading uppercase tracking-wider">
            Cargando Miniatura 3D...
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">
            Preparando peana, luces y materiales WebGL
          </span>
        </div>
      )}

      {/* Error Notice */}
      {loadError && (
        <div className="absolute top-3 left-3 right-3 z-20 p-2 px-3 rounded-lg bg-red-950/80 border border-red-500/40 text-red-200 text-xs text-center">
          {loadError}
        </div>
      )}

      {/* Top Left Title & 3D Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
          <Box className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          Visor 3D Interactivo
        </span>
        {name && (
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-foreground/90 truncate max-w-[200px]">
            {name}
          </span>
        )}
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-black/75 hover:bg-zinc-800 text-muted-foreground hover:text-amber-400 border border-border/80 backdrop-blur-md transition-all shadow-lg"
          title={isFullscreen ? "Salir de pantalla completa" : "Ver a Pantalla Completa"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Interaction hints */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-white/10 text-[10px] text-muted-foreground backdrop-blur-md">
          <Eye className="h-3 w-3 text-amber-400" />
          <span>Arrastra para rotar • Rueda para zoom</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
          {/* Peana Theme Toggle */}
          <div className="flex items-center bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-1 shadow-lg">
            {(["obsidian", "gold", "stone", "bronze"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                  theme === t 
                    ? "bg-amber-500 text-zinc-950 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Cambiar peana a ${t}`}
              >
                {t === "obsidian" ? "Obsidiana" : t === "gold" ? "Oro" : t === "stone" ? "Piedra" : "Bronce"}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleZoom(0.6)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-all"
              title="Acercar Cámara"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.6)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-all"
              title="Alejar Cámara"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-amber-400 transition-all"
              title="Centrar Miniatura"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Auto-spin button */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg ${
              isRotating
                ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-amber-500/20"
                : "bg-black/80 text-amber-400 hover:bg-zinc-800 border-amber-500/40"
            }`}
            title={isRotating ? "Pausar giro automático" : "Activar giro 360°"}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRotating ? "animate-spin" : ""}`} />
            <span>360° Giro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
