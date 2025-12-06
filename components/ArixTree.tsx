import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { TreeState } from '../App';

// CONSTANTS
const PARTICLE_COUNT = 7000; 
const ORNAMENT_COUNT = 180;
const FRAME_COUNT = 8;

// PALETTE
const GOLD_COLOR = new THREE.Color("#FFD700");
const FRAME_COLOR = new THREE.Color("#D4AF37");

// --- USER EDIT: INSERT PHOTO URLS HERE ---
// Replace these URLs with your own image links.
// Ensure your server supports CORS or use local files in the public folder (e.g. "/my-photo.jpg")
const USER_PHOTOS = [
    "https://picsum.photos/id/1011/500/600",
    "https://picsum.photos/id/1015/500/600",
    "https://picsum.photos/id/1016/500/600",
    "https://picsum.photos/id/1018/500/600",
    "https://picsum.photos/id/1019/500/600",
    "https://picsum.photos/id/1025/500/600",
    "https://picsum.photos/id/1020/500/600",
    "https://picsum.photos/id/1024/500/600",
];

// 1. Procedural Texture Generation for Realism (Bump/Roughness)
const useProceduralTextures = () => {
    return useMemo(() => {
        const width = 512;
        const height = 512;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { bumpMap: null, roughnessMap: null };

        // --- Generate Needle Bump Map (Striations) ---
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        
        // Add directional noise for needle grain
        for (let i = 0; i < 50000; i++) {
            const val = Math.random() * 255;
            ctx.fillStyle = `rgba(${val}, ${val}, ${val}, 0.05)`;
            const x = Math.random() * width;
            const y = Math.random() * height;
            // Long thin strips
            ctx.fillRect(x, y, 2, 20); 
        }
        const bumpMap = new THREE.CanvasTexture(canvas);
        bumpMap.wrapS = THREE.RepeatWrapping;
        bumpMap.wrapT = THREE.RepeatWrapping;

        // --- Generate Roughness Map (Organic Noise) ---
        ctx.fillStyle = '#404040'; // Base roughness 
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 20000; i++) {
            const shade = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.1)`;
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
        const roughnessMap = new THREE.CanvasTexture(canvas);

        return { bumpMap, roughnessMap };
    }, []);
};

// 2. Custom Hook for Spiral Ribbon
const useSpiralCurve = (height: number, radiusBase: number, turns: number) => {
    return useMemo(() => {
        const points = [];
        const divisions = 150;
        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const y = (t * height) - (height / 2);
            // Invert radius: Wide at bottom, narrow at top
            const r = (1 - t) * radiusBase; 
            const angle = t * Math.PI * 2 * turns;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            points.push(new THREE.Vector3(x, y, z));
        }
        return new THREE.CatmullRomCurve3(points);
    }, [height, radiusBase, turns]);
};

// 3. Star Shape
const createStarShape = (outerRadius: number, innerRadius: number) => {
    const shape = new THREE.Shape();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / points) * Math.PI;
        const x = Math.sin(angle) * r;
        const y = Math.cos(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
};

const ArixTree: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const needleMeshRef = useRef<THREE.InstancedMesh>(null);
  const ornamentMeshRef = useRef<THREE.InstancedMesh>(null);
  const frameGroupRef = useRef<THREE.Group>(null);
  const ribbonRef = useRef<THREE.Mesh>(null);
  const ribbonMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  // State for interactive frames
  const [activeFrameId, setActiveFrameId] = useState<number | null>(null);

  // Load User Textures
  const photoTextures = useTexture(USER_PHOTOS);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { bumpMap, roughnessMap } = useProceduralTextures();
  
  // Ribbon Geometry
  const spiralCurve = useSpiralCurve(13, 5.5, 4.5);
  const tubeArgs = useMemo(() => [spiralCurve, 128, 0.04, 8, false] as const, [spiralCurve]);

  // Star Geometry
  const starGeometry = useMemo(() => {
      const shape = createStarShape(1.2, 0.6); 
      const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 2
      });
      geo.center(); 
      return geo;
  }, []);

  // --- DATA GENERATION WITH REALISM LOGIC ---
  const { needles, ornaments, frames } = useMemo(() => {
    
    // Helpers
    const getRandomSpherePos = (radius: number) => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * radius;
      const sinPhi = Math.sin(phi);
      return new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
      );
    };

    // --- ORGANIC BRANCH GENERATION ---
    const getOrganicTreePos = (index: number, total: number) => {
        // Height along the tree (0 to 1)
        const hRatio = index / total; 
        
        // --- Branch Logic ---
        // Instead of a perfect cone, we create "Virtual Branches"
        // Determine number of branch whorls (layers)
        const layers = 20; 
        const currentLayer = Math.floor(hRatio * layers);
        const layerProgress = (hRatio * layers) % 1;
        
        // Branches per layer decreases as we go up
        const branchesInLayer = Math.max(3, Math.floor(8 * (1 - hRatio))); 
        const branchIndex = Math.floor(layerProgress * branchesInLayer);
        
        // Base Angle for this branch
        // Add Golden Ratio rotation to layers so they don't align vertically
        const layerAngleOffset = currentLayer * 2.4; 
        const branchAngle = (branchIndex / branchesInLayer) * Math.PI * 2 + layerAngleOffset;
        
        // Add Randomness to angle (Natural variation)
        const angleJitter = (Math.random() - 0.5) * 0.5;
        const finalAngle = branchAngle + angleJitter;

        // Radius at this height (Cone shape base)
        const maxRadius = (1 - Math.pow(hRatio, 0.8)) * 5.0; // Slightly curved profile
        
        // Distance from trunk (Distribution along the branch)
        // More needles at the tips, fewer inside
        const distRatio = Math.sqrt(Math.random()); 
        const r = maxRadius * distRatio;

        // Droop Effect: Branches droop under gravity
        // Outer needles droop more than inner ones
        const droop = r * 0.3; 
        const y = (hRatio * 12) - 6 - (droop * (r/maxRadius));

        const x = Math.cos(finalAngle) * r;
        const z = Math.sin(finalAngle) * r;

        // Store "depth" for coloring (0 = core, 1 = tip)
        const depth = distRatio; 

        return { pos: new THREE.Vector3(x, y, z), depth };
    };

    // 1. NEEDLES
    const tempNeedles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const { pos: treePos, depth } = getOrganicTreePos(i, PARTICLE_COUNT);
      const scatterPos = getRandomSpherePos(15);
      
      // Jitter rotation for natural look
      const rotation = new THREE.Euler(
        (Math.random() - 0.5) * Math.PI + (Math.PI / 4), // Generally pointing up/out
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.5
      );
      
      // --- REALISTIC COLOR VARIATION ---
      const color = new THREE.Color();
      // Base Emerald Green HSL: ~150deg hue
      // Core (depth 0) is darker. Tips (depth 1) are lighter/fresher.
      const hue = 0.4 + (Math.random() * 0.05); // Slight green/teal shift
      const saturation = 0.6 + (Math.random() * 0.2);
      const lightness = 0.05 + (depth * 0.2) + (Math.random() * 0.1); // Dark core, lighter tips
      
      // Occasional "Icy" needle (5% chance)
      if (Math.random() > 0.95) {
          color.set("#AADDFF"); // Ice
      } else {
          color.setHSL(hue, saturation, lightness);
      }

      tempNeedles.push({
        id: i,
        treePos,
        scatterPos,
        rotation,
        color,
        // Tips are smaller, core branches thicker
        scale: (Math.random() * 0.4 + 0.1) * (1.2 - depth * 0.5), 
        currentPos: scatterPos.clone(),
        swayPhase: Math.random() * Math.PI * 2 // For wind animation
      });
    }

    // 2. ORNAMENTS
    const tempOrnaments = [];
    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const ratio = i / ORNAMENT_COUNT;
      // Ornaments hang on the outer edges (depth > 0.7)
      const y = (ratio * 11) - 5.5;
      const maxR = (1 - ratio) * 5.0;
      const r = maxR * (0.8 + Math.random() * 0.3); // Mostly outside
      const angle = Math.random() * Math.PI * 2;
      
      const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const scatterPos = getRandomSpherePos(18);

      // Gold and Silver/Platinum
      const isGold = Math.random() > 0.4;
      const color = isGold ? GOLD_COLOR : new THREE.Color("#E5E4E2");

      tempOrnaments.push({
        id: i,
        treePos,
        scatterPos,
        scale: Math.random() * 0.25 + 0.2,
        currentPos: scatterPos.clone(),
        color
      });
    }

    // 3. FRAMES
    const tempFrames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
        const t = (i + 1) / (FRAME_COUNT + 1);
        const posOnCurve = spiralCurve.getPointAt(t);
        // Push slightly out
        const treePos = posOnCurve.clone().add(posOnCurve.clone().normalize().multiplyScalar(0.5));
        
        const scatterPos = getRandomSpherePos(20);
        const lookAtTarget = new THREE.Vector3(treePos.x * 2, treePos.y, treePos.z * 2);

        tempFrames.push({
            id: i,
            treePos,
            scatterPos,
            lookAt: lookAtTarget,
            currentPos: scatterPos.clone()
        });
    }

    return { needles: tempNeedles, ornaments: tempOrnaments, frames: tempFrames };
  }, [spiralCurve]);

  // --- ANIMATION LOOP ---
  useFrame((state, delta) => {
    const lerpSpeed = 2.0 * delta;
    const time = state.clock.elapsedTime;

    // 1. Ribbon Vis (Adjusted Opacity for Transparency)
    if (ribbonRef.current && ribbonMaterialRef.current) {
        const isTree = treeState === TreeState.TREE;
        // EDIT: Lowered max opacity from 0.3 to 0.15 for more transparency/luxurious softness
        const targetOpacity = isTree ? 0.15 : 0;
        ribbonMaterialRef.current.opacity = THREE.MathUtils.lerp(ribbonMaterialRef.current.opacity, targetOpacity, lerpSpeed);
        ribbonRef.current.visible = ribbonMaterialRef.current.opacity > 0.01;
        if (isTree) ribbonRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }

    // 2. Needles (With Wind Sway)
    if (needleMeshRef.current) {
      needles.forEach((needle, i) => {
        const target = treeState === TreeState.TREE ? needle.treePos : needle.scatterPos;
        needle.currentPos.lerp(target, lerpSpeed);

        dummy.position.copy(needle.currentPos);
        dummy.rotation.copy(needle.rotation);
        
        // --- Micro-Movement: Wind Sway ---
        if (treeState === TreeState.TREE) {
            // Apply wind based on height (more sway at top) and swayPhase
            const heightFactor = (needle.treePos.y + 6) / 12; 
            const windStrength = 0.02 * heightFactor;
            
            dummy.rotation.z += Math.sin(time * 1.5 + needle.swayPhase) * windStrength;
            dummy.rotation.x += Math.cos(time * 1.0 + needle.swayPhase) * windStrength;
        } else {
             // Drifting when scattered
             dummy.position.y += Math.sin(time + needle.id) * 0.002;
             dummy.rotation.x += 0.005;
        }

        dummy.scale.setScalar(needle.scale);
        dummy.updateMatrix();
        needleMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      needleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Ornaments (Slight pendulum effect)
    if (ornamentMeshRef.current) {
        ornaments.forEach((ornament, i) => {
          const target = treeState === TreeState.TREE ? ornament.treePos : ornament.scatterPos;
          ornament.currentPos.lerp(target, lerpSpeed);
          
          dummy.position.copy(ornament.currentPos);
          dummy.rotation.set(0, 0, 0);
          
          if (treeState === TreeState.TREE) {
              // Gentle Bobbing
              dummy.position.y += Math.sin(time * 2 + ornament.id) * 0.01;
          }

          dummy.scale.setScalar(ornament.scale);
          dummy.updateMatrix();
          ornamentMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ornamentMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Frames (Floating & Magnification Logic)
    if (frameGroupRef.current) {
        frameGroupRef.current.children.forEach((child, i) => {
            const frameData = frames[i];
            const isActive = i === activeFrameId;
            
            let targetPos;
            let targetScale = 1;

            if (isActive) {
                // MAGNIFY: Move to front of camera
                const cameraPos = state.camera.position;
                const cameraDir = new THREE.Vector3();
                state.camera.getWorldDirection(cameraDir);
                // Position frame 5 units in front of camera
                targetPos = cameraPos.clone().add(cameraDir.multiplyScalar(5));
                targetScale = 2.5; // Scale up
                
                // Always face camera when active
                child.lookAt(state.camera.position);
            } else {
                // NORMAL: Tree or Scattered position
                targetPos = treeState === TreeState.TREE ? frameData.treePos : frameData.scatterPos;
                
                // Normal rotation logic
                if (treeState === TreeState.TREE) child.lookAt(frameData.lookAt);
                else {
                    child.rotation.y += 0.01; 
                    child.rotation.z += 0.005;
                }
            }

            // Lerp position & scale
            // Use faster lerp for active state responsiveness
            const speed = isActive ? 0.1 : lerpSpeed;
            child.position.lerp(targetPos, speed);
            child.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), speed);
        });
    }
  });

  // Init Colors
  useLayoutEffect(() => {
    if (needleMeshRef.current) {
        needles.forEach((n, i) => needleMeshRef.current!.setColorAt(i, n.color));
        needleMeshRef.current.instanceColor!.needsUpdate = true;
    }
    if (ornamentMeshRef.current) {
        ornaments.forEach((n, i) => ornamentMeshRef.current!.setColorAt(i, n.color));
        ornamentMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [needles, ornaments]);

  return (
    <group scale={0.85}>
      {/* 1. REALISTIC NEEDLES (PBR Material) */}
      <instancedMesh
        ref={needleMeshRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
        castShadow
        receiveShadow
      >
        <tetrahedronGeometry args={[0.2, 0]} />
        {/* PHYSICAL MATERIAL for Realism */}
        <meshPhysicalMaterial 
            color="#ffffff" // Base is white, vertex colors tinted
            roughness={0.6} // Needles are not super shiny
            metalness={0.1} // Slightly reflective but mostly organic
            emissive="#002200" // Subsurface Scattering Fake (Deep Green internal glow)
            emissiveIntensity={0.2}
            bumpMap={bumpMap || undefined}
            bumpScale={0.05}
            roughnessMap={roughnessMap || undefined}
        />
      </instancedMesh>

      {/* 2. ORNAMENTS (High Gloss PBR) */}
      <instancedMesh
        ref={ornamentMeshRef}
        args={[undefined, undefined, ORNAMENT_COUNT]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial 
            roughness={0.15}
            metalness={0.9}
            clearcoat={1.0} // Like polished glass/metal
            clearcoatRoughness={0.1}
            bumpMap={roughnessMap || undefined}
            bumpScale={0.005}
        />
      </instancedMesh>

      {/* 3. RIBBON */}
      <mesh ref={ribbonRef} position={[0, -0.5, 0]}>
         <tubeGeometry args={tubeArgs} />
         <meshStandardMaterial 
            ref={ribbonMaterialRef}
            color={GOLD_COLOR} 
            metalness={1} 
            roughness={0.2} 
            emissive={GOLD_COLOR}
            emissiveIntensity={0.4} 
            transparent={true} 
            opacity={0} 
            depthWrite={false} 
         />
      </mesh>

      {/* 4. FRAMES */}
      <group ref={frameGroupRef}>
          {frames.map((frame, i) => (
              <group 
                key={i} 
                position={frame.scatterPos}
                onClick={(e) => {
                    e.stopPropagation();
                    // Toggle active frame
                    setActiveFrameId(activeFrameId === i ? null : i);
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
              >
                  <mesh castShadow>
                      <boxGeometry args={[1.2, 1.5, 0.1]} />
                      <meshStandardMaterial color={FRAME_COLOR} metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 0, 0.06]}>
                      <planeGeometry args={[1.0, 1.3]} />
                      {/* USER PHOTOS MAPPED HERE */}
                      <meshStandardMaterial 
                        map={photoTextures[i % photoTextures.length]}
                        color="#ffffff" 
                        roughness={0.4}
                      />
                  </mesh>
              </group>
          ))}
      </group>

      {/* 5. TOP STAR */}
      <group position={[0, 6, 0]} scale={treeState === TreeState.TREE ? 1 : 0}>
         <mesh geometry={starGeometry}>
             <meshStandardMaterial 
                color="#AADDFF" 
                emissive="#0088FF"
                emissiveIntensity={3}
                toneMapped={false} 
             />
         </mesh>
         <pointLight color="#AADDFF" intensity={2} distance={5} />
      </group>

    </group>
  );
};

export default ArixTree;