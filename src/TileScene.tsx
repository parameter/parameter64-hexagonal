import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

type UnwrapUniforms = {
  uUnwrap: { value: number };
};

type OnBeforeCompileShader = {
  uniforms: Record<string, unknown>;
  vertexShader: string;
  fragmentShader: string;
};

function UnwrapSphere({
  color,
  imageUrl,
  active,
  pointer,
}: {
  color: string;
  imageUrl: string;
  active: boolean;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const materialRef = React.useRef<THREE.MeshStandardMaterial>(null);
  const unwrapUniforms = React.useRef<UnwrapUniforms | null>(null);
  const map = useTexture(imageUrl);

  React.useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.needsUpdate = true;
  }, [map]);

  const onBeforeCompile = React.useCallback((shader: OnBeforeCompileShader) => {
    shader.uniforms.uUnwrap = { value: 0 };
    unwrapUniforms.current = shader.uniforms as unknown as UnwrapUniforms;

    shader.vertexShader =
      `
      uniform float uUnwrap;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        vec3 spherePos = transformed;
        vec2 uvCentered = uv * 2.0 - 1.0;
        vec3 planePos = vec3(uvCentered.x, uvCentered.y, 0.0);
        // Keep the flattened form slightly rounded at edges
        float edge = 1.0 - smoothstep(0.85, 1.25, length(uvCentered));
        planePos.z = 0.18 * edge;
        transformed = mix(spherePos, planePos, uUnwrap);
      `
    );
  }, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh || !mat) return;

    const t = state.clock.elapsedTime;

    // Unwrap amount (sphere -> plane)
    const u = unwrapUniforms.current;
    const unwrap = u?.uUnwrap.value ?? 0;
    if (u) {
      const target = active ? 1 : 0;
      u.uUnwrap.value = THREE.MathUtils.lerp(u.uUnwrap.value, target, 0.09);
    }

    // As it flattens, all motion "locks" into place.
    // 0 = fully spherical (free motion), 1 = fully flat (no motion)
    const lock = THREE.MathUtils.smoothstep(unwrap, 0.65, 0.98);

    // Rotation
    if (lock < 1) {
      const rotSpeedX = delta * 0.25 * (1 - lock);
      const rotSpeedY = delta * 0.35 * (1 - lock);
      mesh.rotation.x += rotSpeedX;
      mesh.rotation.y += rotSpeedY;
    }
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0, 0.08 + lock * 0.12);
    mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, 0, 0.08 + lock * 0.12);

    // Parallax from pointer (disabled as it flattens)
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1);
    const py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    const targetX = px * 0.25 * (1 - lock);
    const targetY = -py * 0.18 * (1 - lock);
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 0.08 + lock * 0.12);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.08 + lock * 0.12);

    // Soft breathing scale + hover punch
    const base = 0.98 + Math.sin(t * 1.15) * 0.03;
    const targetScale = active ? base * 1.06 : base;
    mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.1));

    // Emissive pulse
    const e = active ? 0.55 : 0.18;
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, e, 0.08);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        ref={materialRef}
        onBeforeCompile={onBeforeCompile}
        map={map}
        color={color}
        metalness={0.15}
        roughness={0.2}
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

export default function TileScene({
  color,
  imageUrl,
  active,
}: {
  color: string;
  imageUrl: string;
  active: boolean;
}) {
  const pointer = React.useRef({ x: 0, y: 0 });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        pointer.current = { x, y };
      }}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.6], fov: 50 }}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={active ? 0.7 : 0.45} />
        <directionalLight position={[2.5, 2, 2]} intensity={active ? 1.35 : 0.9} />
        <directionalLight position={[-2.5, -1, 1]} intensity={active ? 0.9 : 0.55} />
        <UnwrapSphere color={color} imageUrl={imageUrl} active={active} pointer={pointer} />
        <Environment preset="city" />
      </Canvas>

      {/* Soft vignette + highlight */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 120% at 20% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 120% at 80% 100%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 55%)",
          opacity: active ? 0.9 : 0.65,
          transition: "opacity 250ms ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
