import type { Category } from "@grailhaus/shared";
import type { CategoryRevealConfig } from "../core/types";
import { cardsConfig } from "./cards.config";
import { watchesConfig } from "./watches.config";

/**
 * The whole "add a category live" story: a new personality is one config
 * file plus one line here. Nothing in engine/core changes.
 */
export const categoryRegistry: Record<Category, CategoryRevealConfig> = {
  cards: cardsConfig,
  watches: watchesConfig,
};
