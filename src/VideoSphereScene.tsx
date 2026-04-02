import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import sampleVideo from "./video/sample_960x400_ocean_with_audio.mp4";

const MASK_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MASK_FRAGMENT = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float dist = length(c) * 2.0;
    float angle = atan(c.y, c.x);
    float t = uTime;
    float holeRadius = 0.68 + 0.03 * sin(angle * 5.0 + t) + 0.02 * cos(angle * 3.0 + t * 0.7);
    float outerRadius = 1.05 + 0.02 * sin(angle * 4.0 + t * 0.5);
    if (dist < holeRadius) discard;
    if (dist > outerRadius) discard;
    float edge = smoothstep(holeRadius, holeRadius + 0.02, dist) * smoothstep(outerRadius, outerRadius - 0.02, dist);
    gl_FragColor = vec4(0.08, 0.08, 0.12, 0.95 * edge);
  }
`;

function VideoThroughHole() {
  const maskRef = React.useRef<THREE.Mesh>(null);
  const maskUniforms = React.useRef({ uTime: { value: 0 } });

  const [videoTexture, setVideoTexture] = React.useState<THREE.VideoTexture | null>(null);

  React.useEffect(() => {
    const video = document.createElement("video");
    video.src = sampleVideo;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    setVideoTexture(texture);

    const play = () => {
      video.play().catch(() => {});
    };
    video.addEventListener("loadeddata", play);
    video.load();

    return () => {
      video.removeEventListener("loadeddata", play);
      video.pause();
      video.src = "";
      texture.dispose();
    };
  }, []);

  useFrame((state) => {
    if (maskRef.current) {
      const u = (maskRef.current.material as THREE.ShaderMaterial).uniforms;
      if (u?.uTime) u.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!videoTexture) return null;

  const size = 1.5;

  return (
    <group>
      {/* Flat video plane – full rect, not shaped; sits behind the mask */}
      <mesh position={[0, 0, -0.02]} scale={size}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={videoTexture} toneMapped={false} />
      </mesh>
      {/* 2D round mask with organic wavy hole – video shows through the hole only */}
      <mesh ref={maskRef} position={[0, 0, 0]} scale={size}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={MASK_VERTEX}
          fragmentShader={MASK_FRAGMENT}
          uniforms={maskUniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function VideoSphereScene() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #0f0f14 0%, #1a1a24 100%)",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0, 2.2], fov: 50 }}
      >
        <color attach="background" args={["#0f0f14"]} />
        <VideoThroughHole />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
