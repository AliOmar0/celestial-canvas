import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const starVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;
    float intensity = pow(1.0 - dist * 2.0, 2.0);
    gl_FragColor = vec4(vColor, intensity);
  }
`;

function makeStarLayer(count: number, minR: number, maxR: number, sizeMul: number, brightness: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(Math.random() * 2 - 1);
    const r = minR + Math.random() * (maxR - minR);

    pos[i3] = r * Math.sin(theta) * Math.cos(phi);
    pos[i3 + 1] = r * Math.cos(theta);
    pos[i3 + 2] = r * Math.sin(theta) * Math.sin(phi);

    const tint = Math.random();
    if (tint < 0.6) {
      col[i3] = brightness;
      col[i3 + 1] = brightness;
      col[i3 + 2] = brightness;
    } else if (tint < 0.8) {
      col[i3] = brightness * 0.7;
      col[i3 + 1] = brightness * 0.8;
      col[i3 + 2] = brightness;
    } else if (tint < 0.95) {
      col[i3] = brightness;
      col[i3 + 1] = brightness * 0.75;
      col[i3 + 2] = brightness * 0.5;
    } else {
      col[i3] = brightness;
      col[i3 + 1] = brightness * 0.5;
      col[i3 + 2] = brightness * 0.5;
    }

    siz[i] = (Math.random() * 0.6 + 0.2) * sizeMul;
  }

  return { positions: pos, colors: col, sizes: siz };
}

function StarLayer({
  count,
  minR,
  maxR,
  sizeMul,
  brightness,
  rotSpeed,
}: {
  count: number;
  minR: number;
  maxR: number;
  sizeMul: number;
  brightness: number;
  rotSpeed: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const { positions, colors, sizes } = useMemo(
    () => makeStarLayer(count, minR, maxR, sizeMul, brightness),
    [count, minR, maxR, sizeMul, brightness]
  );

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * rotSpeed;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={{
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Starfield() {
  return (
    <>
      {/* Far layer — many tiny dim stars, very slow drift */}
      <StarLayer count={600} minR={80} maxR={120} sizeMul={0.7} brightness={0.6} rotSpeed={0.002} />
      {/* Near layer — fewer brighter stars, slightly faster (parallax) */}
      <StarLayer count={200} minR={30} maxR={55} sizeMul={1.4} brightness={1.0} rotSpeed={0.012} />
    </>
  );
}
