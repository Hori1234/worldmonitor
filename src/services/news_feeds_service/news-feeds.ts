/**
 * Unified news feeds service.
 * Aggregates all FEEDS categories from config/feeds.ts into a single
 * iterable list of { key, label, feeds } entries for the BrowserView tabs.
 */
import { FEEDS } from '@/config/feeds';
import type { Feed, NewsItem } from '@/types';
import { fetchCategoryFeeds } from '../rss';

export interface NewsFeedCategory {
  key: string;
  /** Human-readable label derived from the category key */
  label: string;
  feeds: Feed[];
}

/** Pretty-print a camelCase / snake_case key into a title */
function keyToLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** All news categories from the active FEEDS config. */
export function getAllNewsCategories(): NewsFeedCategory[] {
  return Object.entries(FEEDS).map(([key, feeds]) => ({
    key,
    label: keyToLabel(key),
    feeds,
  }));
}

/** Fetch news for a single category key. Returns sorted NewsItem[]. */
export async function fetchNewsByCategory(categoryKey: string): Promise<NewsItem[]> {
  const feeds = FEEDS[categoryKey];
  if (!feeds) return [];
  return fetchCategoryFeeds(feeds);
}