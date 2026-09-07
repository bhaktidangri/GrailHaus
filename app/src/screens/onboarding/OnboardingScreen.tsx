import { useState } from "react";
import { OnboardingSplash } from "./OnboardingSplash";
import { OnboardingCarousel } from "./OnboardingCarousel";

type Phase = "splash" | "carousel";

/**
 * The first-run flow, ported from the real rn/ reference app (rn/App.js's
 * own route sequence): title screen (tap to start) -> the 3-page onboarding
 * carousel -> done. The reference's own next step after onboarding is a
 * mandatory "gate" (published odds + a required checkbox before the shelf,
 * rn/src/screens/OddsScreen.js) — not built here since it needs real per-pack
 * odds data, not a hardcoded example pack; happy to add it as its own piece.
 * Account creation stays on the existing OTP AuthScreen (surfaced later, on
 * intent) rather than the reference's password-based signup — browsing this
 * app has never required signing in first, and onboarding shouldn't change that.
 */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("splash");

  if (phase === "splash") return <OnboardingSplash onContinue={() => setPhase("carousel")} />;
  return <OnboardingCarousel onFinish={onDone} />;
}
