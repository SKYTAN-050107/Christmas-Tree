/// <reference types="@react-three/fiber" />
import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const WORD_COUNT = 15;
const PHRASE = "I love you Neo Jen Suen";

const BackgroundWords: React.FC = () => {
    // Generate random positions on a large sphere
    const words = useMemo(() => {
        return new Array(WORD_COUNT).fill(0).map((_, i) => {
            // Spherical distribution at large radius (universe background)
            const radius = 45;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            return {
                id: i,
                position: new THREE.Vector3(x, y, z),
                // Slight random rotation for artistic feel
                rotationZ: (Math.random() - 0.5) * 0.5 
            };
        });
    }, []);

    return (
        <group>
            {words.map((word) => (
                <group key={word.id} position={word.position}>
                    {/* Make text look at center (0,0,0) so it's readable from inside */}
                    <Text
                        color="#ffffff"
                        fontSize={2}
                        maxWidth={20}
                        lineHeight={1}
                        letterSpacing={0.05}
                        textAlign="center"
                        font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmj5BN2Azc.woff2"
                        anchorX="center"
                        anchorY="middle"
                        onUpdate={(self) => self.lookAt(0, 0, 0)}
                        fillOpacity={0.4} // Subtle
                    >
                        {PHRASE}
                    </Text>
                </group>
            ))}
        </group>
    );
};

export default BackgroundWords;