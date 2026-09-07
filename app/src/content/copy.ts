/**
 * Every user-facing string in the app lives here — the copy counterpart to
 * theme/tokens.ts for styles. A screen imports what it needs from `copy`
 * instead of writing English directly into JSX, so wording (or, eventually,
 * translation) is a one-file change instead of a hunt through every screen.
 *
 * What does NOT live here: strings that are really data, not copy — a
 * specific pack's name/description (comes from the backend), a component's
 * own internal debug label. If a string is something a copywriter would
 * want to review or reword, it belongs here; if it's something an engineer
 * chose as an implementation detail, it doesn't.
 */

export const brand = {
  name: "GRAILHAUS",
  tagline: "SEALED PACKS",
  copyrightLine: "© GrailHaus · paper USD only",
  disclaimerLine: "No real money moves",
} as const;

export const splash = {
  version: "Ver. 1.0.0",
  supportIdLabel: "Support ID:",
  tapToStart: "TAP TO START",
} as const;

/**
 * The 2-page onboarding carousel's actual copy — kept separate from
 * OnboardingCarousel's per-page accent/tilt/art design data, so this array
 * is pure content. Order must match ONBOARDING_DESIGN in that file.
 *
 * This describes the app — what it is, what the tiers and mechanics
 * actually are — rather than selling how opening a pack should feel. Every
 * factual claim is checked against GrailHaus Product Requirements
 * Document.md: entry pricing is Street Rip $25 / The Reserve $750 (§6, §14);
 * the reveal is a real progressive-odds system, not "just for tension" (§8,
 * §9 — each pull has better odds than the last).
 *
 * A third page ("THE RULES" — server-side generation, Grail Pressure /
 * Curator's Guarantee, the 8% marketplace fee) existed here and was cut as
 * unnecessary for a first-run intro; that's real content the app still owes
 * the user somewhere, just not as an onboarding page — the Shelf or a pack's
 * detail view is the more natural place for it, since it's more useful right
 * before a purchase than before the user has seen a single pack.
 */
export const onboardingPages = [
  {
    eyebrow: "WHAT THIS IS",
    title: "Sealed packs of cards\nand luxury watches.",
    body: "GrailHaus sells sealed packs of trading cards and cases of luxury watches, each in three tiers. You pay a fixed price, open it, and whatever's inside is yours — to keep, or to sell.",
    beats: [
      ["1", "Three tiers, two categories", "Cards from $25. Watches from $750."],
      ["2", "You open it, not a button", "Swipe to tear the foil, or lift a watch case's lid."],
      ["3", "It's yours after that", "Every pull goes into your portfolio and can be resold."],
    ] as [string, string, string][],
  },
  {
    eyebrow: "HOW IT WORKS",
    title: "Odds get better\nas you go.",
    body: "Every card pack uses progressive odds — each pull has a better chance at something rare than the one before it, so the last card in the pack is always the highest-stakes. Watch cases hold one piece, revealed on its own.",
    beats: [
      ["-", "Cards", "5 to 7 pulls per pack, each one better odds than the last."],
      ["-", "Watches", "One watch per case — a single reveal, no pack to work through."],
      ["-", "Rarity tiers", "Cards: Core, Prime, Grail. Watches: Heritage, Icon, Apex."],
    ] as [string, string, string][],
  },
] as const;

export const onboardingControls = {
  skip: "Skip",
  next: "NEXT",
  getStarted: "GET STARTED",
} as const;

export const shelf = {
  signIn: "Sign in",
  emptyPacks: "No packs yet.",
  serverUnreachable: (message: string) => `Server unreachable: ${message}`,
  categoryLabel: { cards: "Trading Cards", watches: "Watches" } as const,
  switchLabel: { cards: "TRADING CARDS", watches: "WATCHES" } as const,
  priceRangeSub: (min: string, max: string) => `Three tiers · $${min} to $${max}`,
} as const;

export const packTile = {
  countLabel: (category: "cards" | "watches", itemCount: number) =>
    category === "cards" ? `${itemCount} card${itemCount === 1 ? "" : "s"}` : "1 watch",
  rip: "RIP",
} as const;

export const buySheet = {
  quantity: (q: 1 | 10) => (q === 1 ? "Buy 1" : "Buy 10"),
  lineItem: (qty: number, priceCents: number) => `${qty} × $${(priceCents / 100).toFixed(2)}`,
  balanceNow: "Balance now",
  balanceAfter: "Balance after",
  insufficientBalance: "Not enough balance for this purchase.",
  cancel: "CANCEL",
  confirm: "CONFIRM",
  working: "WORKING…",
} as const;

export const home = {
  door: {
    eyebrow: "EXPLORE",
    tiersLabel: (n: number) => `${n} tier${n === 1 ? "" : "s"}`,
    fromPrice: (cents: number) => `from $${(cents / 100).toLocaleString()}`,
    comingSoon: "Coming soon",
  },
  featuredDrop: {
    eyebrow: "FEATURED DROP · LIVE",
    left: (remaining: number, max: number) => `${remaining} / ${max}`,
    cta: "VIEW THE DROP",
  },
  upcomingDrops: {
    title: "Upcoming Drops",
    units: (n: number) => `${n} unit${n === 1 ? "" : "s"}`,
    notify: "NOTIFY",
  },
  recentlyRevealed: {
    title: "Recently Revealed",
    sub: "What other collectors pulled in the last hour",
    action: "Live feed",
  },
  collectionProgress: {
    title: "Your Collection Progress",
    action: "Open",
  },
  marketplaceHighlights: {
    title: "Marketplace Highlights",
    action: "Browse",
  },
} as const;

export const dropDetail = {
  body: (sku: { category: "cards" | "watches"; itemCount: number }) => {
    const unit = sku.category === "cards" ? `${sku.itemCount} card${sku.itemCount === 1 ? "" : "s"}` : "one watch";
    return `Each box holds ${unit}, sealed until you claim it. This drop never restocks — once every unit is claimed, it's gone for good.`;
  },
  goesLiveIn: "GOES LIVE IN",
  perBox: "PER BOX",
  remaining: "REMAINING",
  whatIsInside: "WHAT IS INSIDE",
  claim: "CLAIM ONE",
  fairness: "If two of you tap at once, exactly one gets it. You are not charged for a loss.",
} as const;

export const drops = {
  title: "Drops",
  empty: "No drops right now — check back soon.",
  soon: { eyebrow: "NOT YET LIVE", label: "Goes live in" },
  live: { eyebrow: "LIVE NOW", label: "left" },
  closed: { eyebrow: "SOLD OUT", label: "This drop has ended." },
} as const;

/**
 * Email + password + Collector ID — the whole account system in one sheet,
 * opened on demand (browsing stays open; see authStore.requireAuth). Two
 * ideas, kept distinct throughout this copy: the email/password pair is
 * private authentication, and the Collector ID (@username) is the public
 * handle everyone else sees — every account claims exactly one, once,
 * right after its first sign-in.
 */
export const auth = {
  close: "Close",
  subtitle: "Browsing stays open — this is only needed to rip and hold packs.",

  welcomeTitle: "GRAILHAUS",
  welcomeTagline: "Collect what others chase.",
  createAccount: "Create Account",
  alreadyCollecting: "Already collecting?",
  signInLink: "Sign In",

  registerTitle: "Join GrailHaus",
  registerSubtitle: "Private login — no one else sees this.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  passwordPlaceholder: "At least 8 characters",
  confirmPasswordLabel: "Confirm password",
  confirmPasswordPlaceholder: "Type it again",
  createAccountCta: "Create Account",
  noAccount: "Don't have an account?",

  confirmEmailTitle: "Check your email",
  confirmEmailBody: (email: string) => `We sent a confirmation link to ${email}. Confirm it, then sign in below.`,
  confirmEmailCta: "Back to Sign In",

  signInTitle: "Sign In",
  signInSubtitle: "Welcome back.",
  forgotPassword: "Forgot password?",
  signInCta: "Sign In",

  forgotTitle: "Reset your password",
  forgotSubtitle: "We'll email you a link to set a new one.",
  sendResetCta: "Send Reset Email",
  backToSignIn: "Back to sign in",
  forgotSentTitle: "Check your email",
  forgotSentBody: (email: string) => `We sent a password reset link to ${email}.`,

  claimTitle: "Claim Your Collector ID",
  claimSubtitle: "This is how you'll be known across GrailHaus — public, permanent, yours.",
  usernamePlaceholder: "bhakti",
  usernameChecking: "Checking…",
  usernameAvailable: "Available",
  usernameTaken: "Already taken",
  usernameInvalid: "3-20 characters: lowercase letters, numbers, underscore.",
  claimCta: "Continue",

  welcomeBackTitle: (username: string) => `Welcome, @${username}`,
  welcomeBackBody: "Your vault is ready.",
  enterGrailhaus: "Enter GrailHaus",

  emailInvalid: "Enter a valid email address.",
  passwordTooShort: "Password must be at least 8 characters.",
  passwordMismatch: "Passwords don't match.",
} as const;

export const placeholders = {
  portfolio: { title: "Portfolio", note: "Live-ticking portfolio goes here (Deliverable 3)." },
  marketplace: { title: "Marketplace", note: "Peer-to-peer trading goes here (Deliverable 4)." },
} as const;

export const reveal = {
  emptyTitle: "No pack open",
  emptyNote: "Rip a pack from the Shelf to see it here.",
} as const;
