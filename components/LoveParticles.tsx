/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const PARTICLE_COUNT = 300;

interface LoveParticlesProps {
  active: boolean;
}

const LoveParticles: React.FC<LoveParticlesProps> = ({ active }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // --- HEART GEOMETRY GENERATION ---
  const heartGeometry = useMemo(() => {
    const x = 0, y = 0;
    const shape = new THREE.Shape();
    // Standard cubic bezier heart shape
    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 2,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 1,
      bevelThickness: 1,
    });
    
    // Center and scale down the geometry so it's manageable
    geo.center();
    geo.scale(0.02, 0.02, 0.02);
    return geo;
  }, []);

  // --- PARTICLE DATA ---
  // Store dynamic state for each particle
  const particles = useMemo(() => {
    return new Array(PARTICLE_COUNT).fill(0).map(() => ({
      // Position
      pos: new THREE.Vector3(),
      // Velocity
      vel: new THREE.Vector3(),
      // Rotation
      rot: new THREE.Euler(),
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      // Scale logic
      currentScale: 0,
      targetScale: Math.random() * 0.5 + 0.3,
      // Color: Mix of Ruby, Rose Gold, and Deep Red
      color: (() => {
        const rand = Math.random();
        if (rand > 0.6) return new THREE.Color("#E0115F"); // Ruby
        if (rand > 0.3) return new THREE.Color("#B76E79"); // Rose Gold
        return new THREE.Color("#800020"); // Burgundy
      })(),
    }));
  }, []);

  // --- INITIALIZATION ON ACTIVE ---
  useEffect(() => {
    if (active) {
      // When activated, reset particles to center and explode them
      particles.forEach((p) => {
        // Start near center (tree location)
        p.pos.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 10, // Spread vertically along tree height
            (Math.random() - 0.5) * 2
        );
        
        // Explode outward with spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = Math.random() * 0.3 + 0.1; // Explosion speed

        p.vel.set(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi)
        );
        
        // Random rotation start
        p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        
        // Reset scale to pop in
        p.currentScale = 0;
      });
    }
  }, [active, particles]);

  // --- ANIMATION FRAME ---
  useFrame((state) => {
    if (!meshRef.current) return;

    particles.forEach((p, i) => {
      if (active) {
        // Update Position
        p.pos.add(p.vel);
        
        // Drag effect (slow down explosion over time to drift)
        p.vel.multiplyScalar(0.98); 

        // Add gentle drift after initial explosion
        p.pos.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
        p.pos.x += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.002;

        // Rotation
        p.rot.x += p.rotVel.x;
        p.rot.y += p.rotVel.y;
        p.rot.z += p.rotVel.z;

        // Scale Up logic (Pop in)
        p.currentScale = THREE.MathUtils.lerp(p.currentScale, p.targetScale, 0.05);
      } else {
        // Scale Down logic (Fade out when inactive)
        p.currentScale = THREE.MathUtils.lerp(p.currentScale, 0, 0.1);
      }

      // Update Instance Matrix
      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.setScalar(p.currentScale);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      // Set fixed colors once (or update if needed, but static color is fine)
      meshRef.current!.setColorAt(i, p.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[heartGeometry, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        metalness={0.9}
        roughness={0.1}
        emissive="#500000"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
};

export default LoveParticles;