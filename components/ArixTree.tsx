/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef, useLayoutEffect, useState, Suspense } from 'react';
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

// 1. Procedural Texture Generation
const useProceduralTextures = () => {
    return useMemo(() => {
        const width = 512;
        const height = 512;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { bumpMap: null, roughnessMap: null };

        // Bump Map
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 50000; i++) {
            const val = Math.random() * 255;
            ctx.fillStyle = `rgba(${val}, ${val}, ${val}, 0.05)`;
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 20); 
        }
        const bumpMap = new THREE.CanvasTexture(canvas);
        bumpMap.wrapS = THREE.RepeatWrapping;
        bumpMap.wrapT = THREE.RepeatWrapping;

        // Roughness Map
        ctx.fillStyle = '#404040'; 
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

// 2. Spiral Curve Hook
const useSpiralCurve = (height: number, radiusBase: number, turns: number) => {
    return useMemo(() => {
        const points = [];
        const divisions = 150;
        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const y = (t * height) - (height / 2);
            const r = (1 - t) * radiusBase; 
            const angle = t * Math.PI * 2 * turns;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            points.push(new THREE.Vector3(x, y, z));
        }
        return new THREE.CatmullRomCurve3(points);
    }, [height, radiusBase, turns]);
};

// --- SUB-COMPONENT: FRAMES LAYER (ISOLATED FOR SUSPENSE) ---
const FramesLayer: React.FC<{ spiralCurve: THREE.Curve<THREE.Vector3>, treeState: TreeState }> = ({ spiralCurve, treeState }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [activeFrameId, setActiveFrameId] = useState<number | null>(null);
    
    // This hook SUSPENDS until images are loaded. 
    // By keeping it in this sub-component, we don't block the main tree.
    const photoTextures = useTexture(USER_PHOTOS);

    const frames = useMemo(() => {
        const temp = [];
        for (let i = 0; i < FRAME_COUNT; i++) {
            const t = (i + 1) / (FRAME_COUNT + 1);
            const posOnCurve = spiralCurve.getPointAt(t);
            const treePos = posOnCurve.clone().add(posOnCurve.clone().normalize().multiplyScalar(0.5));
            
            // Random sphere pos for scattered state
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = Math.cbrt(Math.random()) * 20;
            const sinPhi = Math.sin(phi);
            const scatterPos = new THREE.Vector3(
                r * sinPhi * Math.cos(theta),
                r * sinPhi * Math.sin(theta),
                r * Math.cos(phi)
            );

            const lookAtTarget = new THREE.Vector3(treePos.x * 2, treePos.y, treePos.z * 2);

            temp.push({
                id: i,
                treePos,
                scatterPos,
                lookAt: lookAtTarget
            });
        }
        return temp;
    }, [spiralCurve]);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((child, i) => {
                const frameData = frames[i];
                const isActive = i === activeFrameId;
                
                let targetPos;
                let targetScale = 1;

                if (isActive) {
                    const cameraPos = state.camera.position;
                    const cameraDir = new THREE.Vector3();
                    state.camera.getWorldDirection(cameraDir);
                    targetPos = cameraPos.clone().add(cameraDir.multiplyScalar(5));
                    targetScale = 2.5; 
                    child.lookAt(state.camera.position);
                } else {
                    targetPos = treeState === TreeState.TREE ? frameData.treePos : frameData.scatterPos;
                    if (treeState === TreeState.TREE) child.lookAt(frameData.lookAt);
                    else {
                        child.rotation.y += 0.01; 
                        child.rotation.z += 0.005;
                    }
                }

                const speed = isActive ? 0.1 : (2.0 * delta);
                child.position.lerp(targetPos, speed);
                child.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), speed);
            });
        }
    });

    return (
        <group ref={groupRef}>
            {frames.map((frame, i) => (
                <group 
                  key={i} 
                  position={frame.scatterPos}
                  onClick={(e) => {
                      e.stopPropagation();
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
                        <meshStandardMaterial 
                          map={photoTextures[i % photoTextures.length]}
                          color="#ffffff" 
                          roughness={0.4}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
};


const ArixTree: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const needleMeshRef = useRef<THREE.InstancedMesh>(null);
  const ornamentMeshRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.Mesh>(null);
  const ribbonMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { bumpMap, roughnessMap } = useProceduralTextures();
  
  // Ribbon Geometry
  const spiralCurve = useSpiralCurve(13, 5.5, 4.5);
  const tubeArgs = useMemo(() => [spiralCurve, 128, 0.04, 8, false] as const, [spiralCurve]);

  // Star Geometry
  const starGeometry = useMemo(() => {
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
      const shape = createStarShape(1.2, 0.6); 
      const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 2
      });
      geo.center(); 
      return geo;
  }, []);

  // --- MAIN TREE DATA GENERATION ---
  const { needles, ornaments } = useMemo(() => {
    // 1. NEEDLES (Pristine Cone Logic)
    const tempNeedles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const yRatio = i / PARTICLE_COUNT;
        const y = (yRatio * 12) - 6;
        const maxRadius = (1 - yRatio) * 5.5; 
        const angle = i * goldenAngle;
        const rRatio = Math.sqrt(Math.random()); 
        const rAdjusted = maxRadius * (0.4 + (rRatio * 0.6)); 
        const x = Math.cos(angle) * rAdjusted;
        const z = Math.sin(angle) * rAdjusted;
        const depth = rAdjusted / maxRadius;
        const treePos = new THREE.Vector3(x, y, z);

        // Scatter Logic
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const rScatter = Math.cbrt(Math.random()) * 15;
        const scatterPos = new THREE.Vector3(
             rScatter * Math.sin(phi) * Math.cos(theta),
             rScatter * Math.sin(phi) * Math.sin(theta),
             rScatter * Math.cos(phi)
        );

        const rotation = new THREE.Euler(
            (Math.random() - 0.5) * 0.5 - 0.2,
            Math.atan2(treePos.x, treePos.z) + (Math.random() - 0.5),
            (Math.random() - 0.5) * 0.5
        );
      
        const color = new THREE.Color();
        const hue = 0.4 + (Math.random() * 0.05); 
        const saturation = 0.6 + (Math.random() * 0.2);
        const lightness = 0.05 + (depth * 0.2) + (Math.random() * 0.1); 
        if (Math.random() > 0.95) color.set("#AADDFF");
        else color.setHSL(hue, saturation, lightness);

        tempNeedles.push({
            id: i, treePos, scatterPos, rotation, color,
            scale: (Math.random() * 0.4 + 0.1) * (1.2 - depth * 0.5), 
            currentPos: scatterPos.clone(),
            swayPhase: Math.random() * Math.PI * 2 
        });
    }

    // 2. ORNAMENTS
    const tempOrnaments = [];
    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const ratio = i / ORNAMENT_COUNT;
      const y = (ratio * 11) - 5.5;
      const maxR = (1 - ratio) * 5.0;
      const r = maxR * (0.8 + Math.random() * 0.3); 
      const angle = Math.random() * Math.PI * 2;
      const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rScatter = Math.cbrt(Math.random()) * 18;
      const scatterPos = new THREE.Vector3(
           rScatter * Math.sin(phi) * Math.cos(theta),
           rScatter * Math.sin(phi) * Math.sin(theta),
           rScatter * Math.cos(phi)
      );

      const isGold = Math.random() > 0.4;
      const color = isGold ? GOLD_COLOR : new THREE.Color("#E5E4E2");

      tempOrnaments.push({
        id: i, treePos, scatterPos,
        scale: Math.random() * 0.25 + 0.2,
        currentPos: scatterPos.clone(),
        color
      });
    }
    return { needles: tempNeedles, ornaments: tempOrnaments };
  }, []);

  useFrame((state, delta) => {
    const lerpSpeed = 2.0 * delta;
    const time = state.clock.elapsedTime;

    // Ribbon Opacity
    if (ribbonRef.current && ribbonMaterialRef.current) {
        const isTree = treeState === TreeState.TREE;
        const targetOpacity = isTree ? 0.15 : 0;
        ribbonMaterialRef.current.opacity = THREE.MathUtils.lerp(ribbonMaterialRef.current.opacity, targetOpacity, lerpSpeed);
        ribbonRef.current.visible = ribbonMaterialRef.current.opacity > 0.01;
        if (isTree) ribbonRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }

    // Needles
    if (needleMeshRef.current) {
      needles.forEach((needle, i) => {
        const target = treeState === TreeState.TREE ? needle.treePos : needle.scatterPos;
        needle.currentPos.lerp(target, lerpSpeed);
        dummy.position.copy(needle.currentPos);
        dummy.rotation.copy(needle.rotation);
        
        if (treeState === TreeState.TREE) {
            const heightFactor = (needle.treePos.y + 6) / 12; 
            const windStrength = 0.02 * heightFactor;
            dummy.rotation.z += Math.sin(time * 1.5 + needle.swayPhase) * windStrength;
            dummy.rotation.x += Math.cos(time * 1.0 + needle.swayPhase) * windStrength;
        } else {
             dummy.position.y += Math.sin(time + needle.id) * 0.002;
             dummy.rotation.x += 0.005;
        }

        dummy.scale.setScalar(needle.scale);
        dummy.updateMatrix();
        needleMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      needleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Ornaments
    if (ornamentMeshRef.current) {
        ornaments.forEach((ornament, i) => {
          const target = treeState === TreeState.TREE ? ornament.treePos : ornament.scatterPos;
          ornament.currentPos.lerp(target, lerpSpeed);
          dummy.position.copy(ornament.currentPos);
          dummy.rotation.set(0, 0, 0);
          if (treeState === TreeState.TREE) dummy.position.y += Math.sin(time * 2 + ornament.id) * 0.01;
          dummy.scale.setScalar(ornament.scale);
          dummy.updateMatrix();
          ornamentMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ornamentMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

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
      {/* Needles */}
      <instancedMesh ref={needleMeshRef} args={[undefined, undefined, PARTICLE_COUNT]} castShadow receiveShadow>
        <tetrahedronGeometry args={[0.2, 0]} />
        <meshPhysicalMaterial 
            color="#ffffff" 
            roughness={0.6} 
            metalness={0.1} 
            emissive="#002200" 
            emissiveIntensity={0.2}
            bumpMap={bumpMap || undefined}
            bumpScale={0.05}
            roughnessMap={roughnessMap || undefined}
        />
      </instancedMesh>

      {/* Ornaments */}
      <instancedMesh ref={ornamentMeshRef} args={[undefined, undefined, ORNAMENT_COUNT]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial 
            roughness={0.15}
            metalness={0.9}
            clearcoat={1.0} 
            clearcoatRoughness={0.1}
            bumpMap={roughnessMap || undefined}
            bumpScale={0.005}
        />
      </instancedMesh>

      {/* Ribbon */}
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

      {/* Star */}
      <group position={[0, 6, 0]} scale={treeState === TreeState.TREE ? 1 : 0}>
         <mesh geometry={starGeometry}>
             <meshStandardMaterial color="#AADDFF" emissive="#0088FF" emissiveIntensity={3} toneMapped={false} />
         </mesh>
         <pointLight color="#AADDFF" intensity={2} distance={5} />
      </group>

      {/* --- ASYNC FRAMES LAYER (Isolated so it doesn't block the rest) --- */}
      <Suspense fallback={null}>
         <FramesLayer spiralCurve={spiralCurve} treeState={treeState} />
      </Suspense>
    </group>
  );
};

export default ArixTree;