import { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";

const LENGTH = 6;

export function OtpInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row}>
      {digits.map((digit, i) => (
        <View key={i} style={[styles.box, digit ? styles.boxFilled : null]}>
          <Text style={styles.digit}>{digit}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, "").slice(0, LENGTH))}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  box: {
    width: 44,
    height: 54,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.outlineSoft,
    borderBottomWidth: 3,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: { borderColor: colors.blue },
  digit: { color: colors.textPrimary, ...typography.title },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
