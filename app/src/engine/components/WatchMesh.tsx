import { useRef } from "react";
import { useFrame } from "@react-three/fiber/native";
import type { Mesh } from "three";
import type { SharedValue } from "react-native-reanimated";

/**
 * A crate lid lifting off a watch. Lighter/stubbed on purpose — proves the
 * registry works for a second, visually distinct category; the full
 * luxury-unboxing choreography is later Deliverable 1 depth.
 * `tierColor` comes from the pack's admin-configurable rarity_tiers data.
 */
export function WatchMesh({
  tierColor,
  openProgress,
}: {
  tierColor: string;
  openProgress: SharedValue<number>;
}) {
  const lidRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!lidRef.current) return;
    const p = openProgress.value;
    lidRef.current.position.y = 0.2 + p * 1.2;
    lidRef.current.rotation.x = -p * 0.8;
  });

  return (
    <group>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 32]} />
        {/* metalness this high needs an environment/reflection map to read as anything but
            near-black under a couple of plain point/directional lights — this scene has neither,
            so it's tuned down from the original 0.9/0.15 (which rendered the whole base
            invisible against the near-black background, reading as "the reveal screen is just
            black") to something that still looks metallic but actually catches direct light. */}
        <meshStandardMaterial color={tierColor} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh ref={lidRef} position={[0, 0.2, 0]}>
        <boxGeometry args={[1.4, 0.4, 1.4]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}
