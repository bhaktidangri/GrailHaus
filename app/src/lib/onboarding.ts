import * as SecureStore from "expo-secure-store";

const KEY = "grailhaus_onboarding_complete";

export async function getOnboardingComplete(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === "1";
}

export async function setOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(KEY, "1");
}

/** Dev-only escape hatch — see the long-press on the Shelf title (__DEV__ only). */
export async function resetOnboarding(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
