import React from 'react';
import { OrbitControls, Environment, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { TreeState } from '../App';
import ArixTree from './ArixTree';
import LoveParticles from './LoveParticles';

interface ExperienceProps {
  treeState: TreeState;
  showLoveEffect: boolean;
}

const Experience: React.FC<ExperienceProps> = ({ treeState, showLoveEffect }) => {
  return (
    <>
      {/* Interaction Controls */}
      <OrbitControls 
        enablePan={false} 
        minDistance={12} 
        maxDistance={35} 
        autoRotate={treeState === TreeState.TREE}
        autoRotateSpeed={0.5} 
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 1.6}
        target={[0, 2, 0]} 
      />

      {/* --- REALISTIC LIGHTING SETUP (Studio Style) --- */}
      {/* 1. Ambient - Low level fill */}
      <ambientLight intensity={0.2} color="#001133" /> 

      {/* 2. Key Light - Warmth hitting the gold and emerald */}
      <spotLight 
        position={[15, 15, 15]} 
        angle={0.3} 
        penumbra={1} 
        intensity={800} 
        color="#fff5cc" 
        castShadow 
        shadow-bias={-0.0001}
      />

      {/* 3. Fill Light - Cool blue from opposite side */}
      <pointLight position={[-15, 5, -15]} intensity={200} color="#204060" decay={2} />

      {/* 4. Rim Light - Strong back light */}
      <spotLight position={[0, 10, -20]} angle={0.5} intensity={1000} color="#AADDFF" />

      {/* 5. Bottom Glow - Luxurious Emerald uplight */}
      <pointLight position={[0, -8, 0]} intensity={100} color="#00ff88" distance={15} decay={2} />

      {/* Environment Map for PBR Reflections */}
      <Environment preset="city" environmentIntensity={0.5} />

      {/* --- ATMOSPHERE --- */}
      <color attach="background" args={['#000205']} /> 
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Atmospheric Particles (Dust/Snow) */}
      <Sparkles 
        count={300} 
        scale={[20, 20, 20]} 
        size={3} 
        speed={0.3} 
        opacity={0.4} 
        color="#AADDFF"
      />

      {/* The Core Interactive Element */}
      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1} floatingRange={[-0.2, 0.2]}>
        <ArixTree treeState={treeState} />
        <LoveParticles active={showLoveEffect} />
      </Float>

      {/* --- CINEMATIC POST-PROCESSING --- */}
      {/* Enabled multisampling for sharp edges (High Fidelity) */}
      <EffectComposer enableNormalPass={false} multisampling={8}>
        
        {/* Halo / Glow - Kept subtle */}
        <Bloom 
          luminanceThreshold={1.1} 
          mipmapBlur 
          intensity={0.6} 
          radius={0.4}
        />
        
        {/* Subtle Film Grain for realism */}
        <Noise opacity={0.05} />
        
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};

export default Experience;