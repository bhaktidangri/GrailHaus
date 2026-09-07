import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from "react-native-svg";

/**
 * A watch on a lit plinth — the mockup's watches equivalent of PackFace, but
 * circular: a radial-gradient dial face, a soft crystal-glint highlight, and
 * a dark cast-shadow ellipse beneath. No crimp, no tier pill, no bulk badge —
 * watches tiles never carry the cards' pack-foil chrome.
 */
export function WatchDial({ art, size }: { art?: string[]; size: number }) {
  const stops = art ?? ["#FFFAF0", "#9A9184", "#3A342B"];
  const offs = stops.length === 4 ? [0, 0.34, 0.72, 1] : [0, 0.5, 0.82];
  const shadowWidth = size * 0.92;
  const shadowHeight = size * 0.13;

  return (
    <View style={[styles.wrap, { width: size, height: size * 1.16 }]}>
      <Svg width={size} height={size * 1.16} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="dial" cx="34%" cy="28%" r="70%">
            {stops.map((c, i) => (
              <Stop key={i} offset={offs[i]} stopColor={c} stopOpacity="1" />
            ))}
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={size / 2}
          cy={size * 1.16 - shadowHeight / 2}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill="rgba(0,0,0,0.85)"
        />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="url(#dial)" />
        <Circle cx={size * 0.36} cy={size * 0.32} r={size * 0.16} fill="rgba(255,255,255,0.4)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center" },
});
