// Ported from card-pack-reveal-prototype/src/vault/ui/VaultVignette.tsx — three layered
// radial-gradients on Skia's declarative <Canvas>, same technique as the Tier 1 pack reveal's
// own vignette background.
import { Canvas, Rect, RadialGradient, vec } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";

export function VaultVignette({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color="#05030a" />
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, height * 0.38)}
          r={Math.max(width * 0.26, height * 0.2) / 0.64}
          colors={["rgba(92,52,158,0.20)", "rgba(5,3,10,0)"]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, height * 1.16)}
          r={Math.max(width * 0.6, height * 0.45) / 0.58}
          colors={["rgba(232,207,162,0.07)", "rgba(5,3,10,0)"]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, height * 0.5)}
          r={Math.max(width * 0.65, height * 0.55)}
          colors={["rgba(5,3,10,0)", "rgba(5,3,10,0)", "rgba(3,2,6,0.86)"]}
          positions={[0, 0.42, 1]}
        />
      </Rect>
    </Canvas>
  );
}
