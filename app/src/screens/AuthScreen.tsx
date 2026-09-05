import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useAuthViewModel } from "../viewmodels/useAuthViewModel";
import { OtpInput } from "../components/OtpInput";
import { GlossyButton } from "../components/GlossyButton";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Method = "email" | "phone";

export function AuthScreen({ onClose }: { onClose: () => void }) {
  const auth = useAuthViewModel();
  const [method, setMethod] = useState<Method>("email");
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleContinue() {
    setValidationError(null);
    if (method === "email") {
      const trimmed = input.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setValidationError("Enter a valid email address.");
        return;
      }
      auth.sendOtp("email", trimmed);
    } else {
      const parsed = parsePhoneNumberFromString(input.trim());
      if (!parsed?.isValid()) {
        setValidationError("Enter a valid phone number with country code, e.g. +1 555 123 4567.");
        return;
      }
      auth.sendOtp("phone", parsed.number);
    }
  }

  function handleVerify(nextCode: string) {
    setCode(nextCode);
    if (nextCode.length === 6) auth.verifyOtp(nextCode);
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>

        {auth.step === "identifier" ? (
          <>
            <Text style={styles.title}>Sign in to continue</Text>
            <Text style={styles.subtitle}>Browsing stays open — this is only needed to rip and hold packs.</Text>

            <View style={styles.segment}>
              {(["email", "phone"] as Method[]).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.segmentItem, method === m && styles.segmentItemActive]}
                  onPress={() => {
                    setMethod(m);
                    setInput("");
                    setValidationError(null);
                  }}
                >
                  <Text style={[styles.segmentText, method === m && styles.segmentTextActive]}>
                    {m === "email" ? "Email" : "Phone"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={method === "email" ? "you@example.com" : "+1 555 123 4567"}
              placeholderTextColor={colors.textMuted}
              keyboardType={method === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              autoComplete={method === "email" ? "email" : "tel"}
              style={styles.input}
            />
            {(validationError || auth.error) && (
              <Text style={styles.error}>{validationError ?? auth.error}</Text>
            )}

            <GlossyButton
              label="Continue"
              onPress={handleContinue}
              disabled={!input}
              loading={auth.isSubmitting}
              variant="blue"
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>
              Sent to {auth.identifier?.value}.{" "}
              <Text style={styles.link} onPress={auth.reset}>
                Not you?
              </Text>
            </Text>

            <OtpInput value={code} onChange={handleVerify} autoFocus />
            {auth.error && <Text style={[styles.error, styles.errorCentered]}>{auth.error}</Text>}
            {auth.isSubmitting && <ActivityIndicator color={colors.blue} style={{ marginTop: spacing.md }} />}

            <Pressable
              style={styles.resend}
              onPress={auth.resend}
              disabled={auth.cooldown > 0 || auth.isSubmitting}
            >
              <Text style={[styles.link, auth.cooldown > 0 && styles.linkDisabled]}>
                {auth.cooldown > 0 ? `Resend code in ${auth.cooldown}s` : "Resend code"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, paddingTop: spacing.xxl * 2 },
  close: { position: "absolute", top: spacing.xl, right: spacing.xl },
  closeText: { color: colors.textMuted, ...typography.body },
  title: { color: colors.textPrimary, ...typography.display, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, ...typography.body, marginBottom: spacing.xl },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.outlineSoft,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.blue },
  segmentText: { color: colors.textMuted, ...typography.body },
  segmentTextActive: { color: "#ffffff" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outlineSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, ...typography.caption, marginBottom: spacing.sm },
  errorCentered: { textAlign: "center", marginTop: spacing.md },
  link: { color: colors.blue },
  linkDisabled: { color: colors.textMuted },
  resend: { marginTop: spacing.xl, alignSelf: "center" },
});
