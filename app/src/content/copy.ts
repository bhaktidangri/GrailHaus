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
  explorePacks: {
    eyebrow: "EXPLORE PACKS",
    heading: "Pick your tier.",
    sub: "Same odds published on every one.",
    mostOpened: "MOST OPENED",
    trustNote: "Every tier publishes its odds and expected value before you buy.",
    collectionLink: "Or open My Collection instead",
    leftSuffix: "left",
  },
} as const;

export const packTile = {
  countLabel: (category: "cards" | "watches", itemCount: number) =>
    category === "cards" ? `${itemCount} card${itemCount === 1 ? "" : "s"}` : "1 watch",
  buyOne: "BUY 1",
  buyTen: "×10",
} as const;

export const explore = {
  eyebrow: "EXPLORE",
  heading: "The whole catalog.",
  sub: "Every evergreen tier, cards and watches, in one place.",
  signIn: "Sign in",
  sectionCards: "Trading Cards",
  sectionWatches: "Watches",
  allCards: (count: number) => `All Cards (${count})`,
  allWatches: (count: number) => `All Watches (${count})`,
  emptySection: (label: string) => `No ${label.toLowerCase()} available right now.`,
  serverUnreachable: (message: string) => `Server unreachable: ${message}`,
} as const;

export const confirmPurchase = {
  eyebrowCards: "CONFIRM PURCHASE",
  eyebrowWatches: "CONFIRM UNLOCK",
  lineItem: "1 × pack",
  unlockPrice: "Unlock price",
  youReceive: "You receive",
  oneWatch: "One watch, sealed",
  balanceNow: "Balance now",
  balanceAfter: "Balance after",
  evNote: (expectedCents: number, priceCents: number, isWatches: boolean) =>
    `Expected contents are $${(expectedCents / 100).toFixed(2)} against a $${(priceCents / 100).toFixed(2)} ${
      isWatches ? "unlock" : "price"
    }. Most ${isWatches ? "unlocks" : "packs"} return less than they cost. ${
      isWatches
        ? "The reference is decided on our server the instant you pay."
        : "Buy the moment, not the return."
    }`,
  insufficientBalance: "Not enough balance for this purchase.",
  cancel: "CANCEL",
  pay: "PAY",
  working: "WORKING…",
} as const;

export const packDetail = {
  body: (sku: { itemCount: number }) =>
    `${sku.itemCount} cards, sealed until you tear it. Odds and expected value are published below — nobody rips without knowing the downside.`,
  price: "PRICE",
  cards: "CARDS",
  valueRange: "VALUE RANGE",
  possibleRarities: "POSSIBLE RARITIES",
  collectionPreview: "COLLECTION PREVIEW",
  fullOdds: "Full odds ›",
  ripNow: "RIP NOW",
} as const;

export const vaultDetail = {
  body: "One watch, sealed until you unlock it. Odds and expected value are published below — nobody unlocks without knowing the downside.",
  price: "PRICE",
  receive: "YOU RECEIVE",
  oneWatch: "One watch",
  valueRange: "VALUE RANGE",
  rarityPossibilities: "RARITY POSSIBILITIES",
  featuredWatches: "FEATURED WATCHES",
  collectionPreview: "COLLECTION PREVIEW",
  fullOdds: "Full odds ›",
  unlockVault: "UNLOCK VAULT",
} as const;

export const home = {
  door: {
    eyebrow: "EXPLORE",
    shortLabel: { cards: "Cards", watches: "Watches" } as const,
    tiersLabel: (n: number) => `${n} tier${n === 1 ? "" : "s"}`,
    fromPrice: (cents: number) => `from $${(cents / 100).toLocaleString()}`,
    comingSoon: "Coming soon",
  },
  featuredDrop: {
    eyebrow: "FEATURED DROP · LIVE",
    left: (remaining: number, max: number) => `${remaining} / ${max}`,
    // Static placeholder — no live viewer-count backend exists yet (same call as the
    // Drop screens' claims feed: match the mockup's number rather than invent one).
    watching: "1,842 watching",
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
  body: (sku: { category: "cards" | "watches"; itemCount: number; maxStock: number | null }) => {
    const unit = sku.category === "cards" ? `${sku.itemCount} card${sku.itemCount === 1 ? "" : "s"}` : "one watch";
    const boxes = sku.maxStock != null ? `${sku.maxStock} box${sku.maxStock === 1 ? "" : "es"}. ` : "";
    return `${boxes}Each holds ${unit}, sealed until you claim it. Nothing restocks.`;
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

  signInTitle: "Sign In",
  signInSubtitle: "Welcome back.",
  signInCta: "Sign In",

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

export const collection = {
  title: "My Collection",
  itemCount: (n: number, categories: number) => `${n} item${n === 1 ? "" : "s"} · ${categories} categor${categories === 1 ? "y" : "ies"}`,
  totalValue: "TOTAL VALUE",
  cardsLabel: (pct: number) => `Cards ${pct}%`,
  watchesLabel: (pct: number) => `Watches ${pct}%`,
  binder: { eyebrow: "TRADING CARDS", title: "Collection Binder", cta: "OPEN BINDER" },
  vault: { eyebrow: "WATCHES", title: "The Vault", cta: "ENTER VAULT" },
  cardsSummary: (n: number, sets: number, valueCents: number) =>
    `${n} card${n === 1 ? "" : "s"} · ${sets} set${sets === 1 ? "" : "s"} · $${(valueCents / 100).toLocaleString()}`,
  watchesSummary: (n: number, brands: number, valueCents: number) =>
    `${n} watch${n === 1 ? "" : "es"} · ${brands} brand${brands === 1 ? "" : "s"} · $${(valueCents / 100).toLocaleString()}`,
  empty: "Rip your first pack to start a collection.",
  signInTitle: "Sign in to see your collection",
  signInBody: "Everything you pull gets tracked here — sign in to pick up where you left off.",
} as const;

export const binder = {
  all: (n: number) => `ALL ${n}`,
  header: "Collection Binder",
  empty: "No cards in this collection yet.",
  filterBack: "Filter binder",
  facetCollection: "Collection",
  facetRarity: "Rarity",
} as const;

export const vault = {
  header: "The Vault",
  piecesHeld: (n: number) => `${n === 1 ? "One piece" : `${numberWord(n)} pieces`} held`,
  appraised: (valueCents: number) => `$${(valueCents / 100).toLocaleString()} appraised`,
  brands: (n: number) => `${n} brand${n === 1 ? "" : "s"}`,
  empty: "No watches in the vault yet.",
} as const;

function numberWord(n: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  return words[n] ?? String(n);
}

export const itemDetail = {
  owned: "OWNED",
  rarity: "RARITY",
  collectionLabel: "COLLECTION",
  ownedCopies: (n: number) => `${n} cop${n === 1 ? "y" : "ies"}`,
  traits: "TRAITS",
  estimatedValue: "ESTIMATED VALUE",
  valueRange: (minCents: number, maxCents: number) =>
    `Ranges $${(minCents / 100).toLocaleString()} – $${(maxCents / 100).toLocaleString()}`,
  acquired: (date: string) => `Acquired ${date}`,
  ownershipHistory: "OWNERSHIP HISTORY",
  keep: "KEEP",
  sell: "SELL",
  viewCollection: (name: string) => `VIEW COLLECTION · ${name.toUpperCase()}`,
  specifications: "SPECIFICATIONS",
  marketValue: "MARKET VALUE",
} as const;

export const sellItem = {
  header: "Set listing price",
  yourAsk: "YOUR ASK",
  buyerPays: "Buyer pays",
  platformFee: (pct: number) => `Platform fee · ${pct}%`,
  youReceive: "You receive",
  netNote: "Credited the moment a buyer completes checkout. Fee is only charged on a sale — listing is free.",
  confirm: "CONFIRM LISTING",
  working: "LISTING…",
  liveTitle: "Listed",
  liveBody: (priceCents: number) => `Live on the market at $${(priceCents / 100).toLocaleString()}.`,
  viewListing: "VIEW IN MARKETPLACE",
  done: "Done",
  error: "Couldn't list that item.",
} as const;

export const discover = {
  title: "Discover",
  headline: "Find the thing\nyou already want.",
  body: "Search the catalogue, then choose how to get it — chase it in a pack, or buy the exact one from someone who has it.",
  searchPlaceholder: "Search cards, watches, sets, brands",
  cardsDoor: { eyebrow: "CARDS", title: "Card Discovery" },
  watchesDoor: { eyebrow: "WATCHES", title: "Watch Discovery" },
  collectionsDoor: { eyebrow: "COLLECTIONS", title: "Browse Collections" },
  doorSummary: (items: number, tiers: number, listed: number) =>
    `${items} items · ${tiers} tier${tiers === 1 ? "" : "s"} · ${listed} listed now`,
  collectionsDoorSummary: (collections: number, items: number) =>
    `${collections} collection${collections === 1 ? "" : "s"} · ${items} items · spans both worlds`,
} as const;

export const discoverCategory = {
  resultsFor: (n: number, query: string) => (query ? `${n} results for "${query}"` : `${n} results`),
  ownedBadge: (n: number) => `YOU HOLD ${n}`,
  printings: (n: number) => `${n} printing${n === 1 ? "" : "s"}`,
  priceRange: (minCents: number, maxCents: number) =>
    minCents === maxCents
      ? `$${(minCents / 100).toLocaleString()}`
      : `$${(minCents / 100).toLocaleString()} – $${(maxCents / 100).toLocaleString()}`,
  empty: "Nothing matches yet.",
  facetIdentity: { cards: "Pokémon", watches: "Brands" } as const,
  facetCollections: "Collections",
  facetRarities: "Rarities",
  itemCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
} as const;

export const collections = {
  title: "Collections",
  body: "Curated sets that cut across both worlds — a collection can hold cards, watches, or both.",
  itemCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
  categoriesLabel: (categories: string[]) => categories.join(" + "),
  empty: "No collections yet.",
} as const;

export const versions = {
  header: "All versions",
  versionCount: (n: number) => `${n} printing${n === 1 ? "" : "s"}`,
  ownedBadge: (n: number) => `OWNED ×${n}`,
  listedBadge: (n: number) => `${n} listed`,
  noneListed: "none listed",
  tapHint: "Tap a version to see the item",
} as const;

export const itemFork = {
  rarity: "RARITY",
  collectionLabel: "COLLECTION",
  youOwn: "YOU OWN",
  none: "None",
  estimatedValue: "ESTIMATED VALUE",
  collectorStory: "COLLECTOR STORY",
  availability: "AVAILABILITY",
  listedNow: "LISTED NOW",
  packPrice: "IN PACK",
  howToGet: "How to get this?",
  tryYourLuck: "TRY YOUR LUCK",
  fromPack: (name: string) => `From ${name}`,
  buyExact: "BUY EXACT ITEM",
  listingsFrom: (n: number, cents: number) => `${n} listing${n === 1 ? "" : "s"} · from $${(cents / 100).toLocaleString()}`,
  noListings: "Not listed right now",
} as const;

export const marketplace = {
  title: "Market",
  browse: "BROWSE",
  myListings: "MY LISTINGS",
  categoryAll: (n: number) => `Both · ${n} live`,
  empty: "No listings yet — be the first to list something.",
  myListingsEmpty: "You don't have anything listed right now.",
  liveBadge: "LIVE",
  signInTitle: "Sign in to see your listings",
  signInBody: "Track what you've put up for sale — sign in to see your own book.",
  filters: "FILTERS",
  filtersTitle: "Filter listings",
  facetRarity: "Rarity",
  facetCollection: "Collection",
  facetPrice: "Price",
  facetIdentity: { cards: "Pokémon", watches: "Brand" } as const,
  clearFilters: "CLEAR ALL",
  applyFilters: "SHOW RESULTS",
  pickCategoryFirst: "Pick Cards or Watches to filter by this.",
} as const;

export const listingDetail = {
  ask: "ASK",
  from: (username: string | null) => (username ? `from @${username}` : "from a collector"),
  buyNow: "BUY NOW",
  buying: "BUYING…",
  editPrice: "EDIT PRICE",
  cancelListing: "CANCEL LISTING",
} as const;

export const editPriceSheet = {
  title: "Edit listing price",
  yourAsk: "YOUR ASK",
  buyerPays: "Buyer pays",
  platformFee: (pct: number) => `Platform fee · ${pct}%`,
  youReceive: "You receive",
  save: "SAVE PRICE",
  saving: "SAVING…",
  cancel: "CANCEL",
} as const;

export const buyListing = {
  header: "Confirm purchase",
  youPay: "YOU PAY",
  balanceNow: "Balance now",
  balanceAfter: "Balance after",
  feeNote: "The platform fee comes out of the seller's proceeds, not your total. You pay the ask and nothing more.",
  continue: "CONFIRM & PAY",
  working: "PROCESSING…",
  successTitle: "It's yours.",
  successSub: "PURCHASE COMPLETE",
  paid: "Paid",
  newBalance: "New balance",
  viewInCollection: "VIEW IN COLLECTION",
  keepBrowsing: "Keep browsing the market",
  cancel: "CLOSE",
} as const;

export const reveal = {
  emptyTitle: "No pack open",
  emptyNote: "Rip a pack from the Shelf to see it here.",
} as const;

export const vaultFlow = {
  summaryTitle: "Watch Revealed",
  viewDetails: "VIEW DETAILS",
  keep: "KEEP",
  listForSale: "LIST FOR SALE",
} as const;

export const cardFlow = {
  processing: {
    title: "PURCHASE PROCESSING",
    heading: "Rolling your pack",
    body: "Contents were decided on our server the instant you paid — this pause is just theatre before the rip.",
    paymentSuccess: "Payment success",
    stockDecremented: "Stock decremented",
    sealingContents: "Sealing contents",
  },
  ready: {
    title: "PACK READY",
    heading: "Sealed and waiting for you.",
    insideLabel: "INSIDE",
    insideValue: (count: number) => `${count} card${count === 1 ? "" : "s"}`,
    beginRip: "BEGIN RIP",
    openLater: "Open it later — it stays in your queue",
  },
  introduction: {
    heading: (count: number) => `${count} cards. One is worth keeping.`,
    body: "Swipe up to tear the foil. Then swipe left through what you got, one card at a time.",
    hint: "SWIPE UP TO TEAR",
  },
  card: {
    title: (index: number, total: number) => `CARDS · ${index} OF ${total}`,
    statusLabel: "STATUS",
    newLabel: "New to your binder",
    duplicateLabel: (holdCount: number) => `Duplicate · you hold ${holdCount}`,
    runningTotalLabel: "RUNNING TOTAL",
    hint: "SWIPE LEFT",
  },
  final: {
    title: (total: number) => `FINAL CARD · ${total} OF ${total}`,
    hold: "HOLD",
    newToBinder: "New to your binder",
    continueHint: "TAP TO CONTINUE",
    holdHint: "HOLD TO REVEAL",
  },
  summary: {
    title: "PACK COMPLETE",
    pulledOn: (totalValueCents: number, priceCents: number, count: number) =>
      `$${(totalValueCents / 100).toFixed(0)} pulled on a $${(priceCents / 100).toFixed(0)} pack · ${count} cards`,
    newLabel: "NEW",
    duplicateLabel: "DUPLICATE",
    collectionValueLabel: "PULL VALUE",
    addedToCollection: "✓ Added to your collection",
    ripAgain: (tierName: string) => `RIP ANOTHER ${tierName.toUpperCase()}`,
    ripAgainWorking: "RIPPING…",
    viewCollection: "VIEW COLLECTION",
    backToHome: "BACK TO HOME",
    done: "DONE",
  },
} as const;
