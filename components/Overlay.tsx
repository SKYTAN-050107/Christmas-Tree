import React from 'react';
import { TreeState } from '../App';

interface OverlayProps {
  treeState: TreeState;
  onToggle: () => void;
  isTransitioning?: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ treeState, onToggle, isTransitioning = false }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 z-10">
      
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          {/* --- EDIT TITLE HERE --- */}
          <h1 className="text-white font-serif text-3xl md:text-5xl tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Happy <span className="text-[#FFD700]">Christmas</span> <span className="text-[#FFD700]">2025</span>
          </h1>
          {/* --- EDIT SUBTITLE HERE --- */}
          <p className="text-[#888] text-xs md:text-sm mt-2 tracking-[0.3em] uppercase font-sans">
            The Third Christmas We Celebrate Together 
          </p>
        </div>
      </header>

      {/* Center Action (Sticky for Mobile) */}
      <div className="pointer-events-auto flex flex-col items-center justify-center gap-4">
        <button
          onClick={onToggle}
          disabled={isTransitioning}
          className={`
            group relative px-8 py-3 
            transition-all duration-700 ease-out
            backdrop-blur-sm border border-[#FFD700]/30
            rounded-full overflow-hidden
            opacity-30 hover:opacity-100 active:opacity-100
            ${isTransitioning ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-[#FFD700] hover:bg-[#FFD700]/10'}
          `}
        >
          {/* Animated Background */}
          {!isTransitioning && (
             <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          )}
          
          <span className="relative flex items-center gap-3">
             <span className={`
                w-2 h-2 rounded-full transition-colors duration-500
                ${treeState === TreeState.TREE ? 'bg-[#FFD700] shadow-[0_0_10px_#FFD700]' : 'bg-gray-500'}
             `} />
             <span className="text-[#FFD700] font-serif text-lg tracking-widest uppercase">
               {/* --- EDIT BUTTON TEXT HERE --- */}
               {isTransitioning 
                  ? 'Magic in progress...' 
                  : (treeState === TreeState.SCATTERED ? 'Assemble my personal Christmas Tree' : 'I love You')}
             </span>
          </span>
        </button>

        <p className="text-white/40 text-[10px] uppercase tracking-widest animate-pulse">
            {/* --- EDIT STATUS TEXT HERE --- */}
            {treeState === TreeState.SCATTERED ? 'elements drifting' : 'Christmas tree is done~'}
        </p>
      </div>

      {/* Footer Details */}
      <footer className="flex justify-between items-end text-white/50 text-xs font-sans">
        <div className="hidden md:block max-w-xs">
          {/* --- EDIT FOOTER TEXT HERE --- */}
          <p>From</p>
          <p className="mt-1">Your beloved babyyy</p>
        </div>
      </footer>
    </div>
  );
};

export default Overlay;