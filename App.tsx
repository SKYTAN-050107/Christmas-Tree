import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Experience from './components/Experience';
import Overlay from './components/Overlay';

// Define the two primary states required by the prompt
export enum TreeState {
  SCATTERED = 'scattered',
  TREE = 'tree',
}

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);
  const [showLoveEffect, setShowLoveEffect] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleState = () => {
    // Prevent interaction during the magical sequence
    if (isTransitioning) return;

    if (treeState === TreeState.TREE) {
      // SEQUENCE START: "I Love You" clicked
      // 1. Trigger Love Elements Explosion
      setShowLoveEffect(true);
      setIsTransitioning(true);

      // 2. Wait for the love particles to fly into the universe before scattering the tree
      setTimeout(() => {
        // 3. Trigger "Magic Scattering" (Tree disperses)
        setTreeState(TreeState.SCATTERED);
        setIsTransitioning(false);
        // Note: We keep showLoveEffect true so hearts float in the universe alongside scattered tree
      }, 3000); // 3-second delay for the love storm

    } else {
      // "Assemble" clicked
      // Reset everything back to Tree form
      setTreeState(TreeState.TREE);
      setShowLoveEffect(false); // Hide love hearts
      setIsTransitioning(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#000502]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          camera={{ position: [0, 0, 15], fov: 45 }}
          dpr={[1, 2]} // Handle high DPI screens for sharpness
          gl={{ antialias: false }} // Let PostProcessing handle AA or Bloom naturally
        >
          <Suspense fallback={null}>
            <Experience treeState={treeState} showLoveEffect={showLoveEffect} />
          </Suspense>
        </Canvas>
        <Loader 
            dataInterpolation={(p) => `Loading Arix Luxury Engine ${p.toFixed(0)}%`} 
            containerStyles={{ background: '#000502' }}
            innerStyles={{ background: '#222', width: '200px' }}
            barStyles={{ background: '#D4AF37', height: '2px' }}
            dataStyles={{ color: '#D4AF37', fontFamily: 'Cinzel', fontSize: '12px' }}
        />
      </div>

      {/* UI Overlay Layer */}
      <Overlay 
        treeState={treeState} 
        onToggle={toggleState} 
        isTransitioning={isTransitioning}
      />
    </div>
  );
};

export default App;
