import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface EntityOrbProps {
  isThinking?: boolean;
  size?: number;
}

function OrbMesh({ isThinking = false }: { isThinking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<any>(null!);
  const baseRotationSpeed = 0.003;
  const targetSpeed = isThinking ? 0.015 : baseRotationSpeed;
  const currentSpeed = useRef(baseRotationSpeed);
  const pulsePhase = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    currentSpeed.current += (targetSpeed - currentSpeed.current) * 0.05;
    meshRef.current.rotation.x += currentSpeed.current;
    meshRef.current.rotation.y += currentSpeed.current * 0.7;

    if (isThinking) {
      pulsePhase.current += delta * 3;
      const pulse = 1 + Math.sin(pulsePhase.current) * 0.08;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
      pulsePhase.current = 0;
    }
  });

  const icoGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.4, 4), []);

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={meshRef} geometry={icoGeometry}>
        <MeshTransmissionMaterial
          ref={materialRef}
          backside
          samples={6}
          resolution={256}
          transmission={0.95}
          roughness={0.05}
          thickness={0.5}
          ior={1.5}
          chromaticAberration={0.06}
          anisotropy={0.2}
          distortion={0.1}
          distortionScale={0.2}
          temporalDistortion={0.1}
          color="#556B2F"
          attenuationColor="#3E5020"
          attenuationDistance={0.5}
          toneMapped={true}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh geometry={icoGeometry} scale={0.6}>
        <meshStandardMaterial
          color={isThinking ? '#D4AF37' : '#556B2F'}
          emissive={isThinking ? '#D4AF37' : '#556B2F'}
          emissiveIntensity={isThinking ? 1.5 : 0.4}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Ambient particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={useMemo(() => {
              const arr = new Float32Array(150);
              for (let i = 0; i < 150; i += 3) {
                arr[i] = (Math.random() - 0.5) * 5;
                arr[i + 1] = (Math.random() - 0.5) * 5;
                arr[i + 2] = (Math.random() - 0.5) * 5;
              }
              return arr;
            }, [])}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color={isThinking ? '#D4AF37' : '#556B2F'}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </Float>
  );
}

export default function EntityOrb({ isThinking = false, size = 200 }: EntityOrbProps) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#F5F5F0" />
        <pointLight position={[-3, 2, -2]} intensity={0.5} color="#556B2F" />
        {isThinking && (
          <pointLight position={[0, 0, 2]} intensity={1.2} color="#D4AF37" />
        )}
        <Environment preset="night" />
        <OrbMesh isThinking={isThinking} />
      </Canvas>
    </div>
  );
}
