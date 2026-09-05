import { useEffect, useRef, useState } from "react";
import { authService, type AuthIdentifier } from "../services/authService";

const RESEND_COOLDOWN_SECONDS = 30;

type Step = "identifier" | "otp";

export function useAuthViewModel() {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState<AuthIdentifier | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  async function sendOtp(method: AuthIdentifier["method"], value: string) {
    setSubmitting(true);
    setError(null);
    try {
      const next: AuthIdentifier = { method, value };
      await authService.sendOtp(next);
      setIdentifier(next);
      setStep("otp");
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send code — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!identifier || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await authService.sendOtp(identifier);
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend code — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(code: string) {
    if (!identifier) return;
    setSubmitting(true);
    setError(null);
    try {
      await authService.verifyOtp(identifier, code);
      // Session update flows through supabase.auth.onAuthStateChange, handled at the app root.
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep("identifier");
    setIdentifier(null);
    setError(null);
    setCooldown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return { step, identifier, isSubmitting, error, cooldown, sendOtp, resend, verifyOtp, reset };
}
