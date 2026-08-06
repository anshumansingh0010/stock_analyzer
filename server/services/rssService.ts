/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — RSS FEED AGGREGATOR SERVICE                       ║
 * ║                                                                      ║
 * ║  Fetches, cleans, and aggregates stock market news from multiple     ║
 * ║  RSS feeds (Zerodha Pulse, Google News, Economic Times, MC).          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import Parser from "rss-parser";
import { NewsArticleInput } from "../prompts/newsPrompt.js";

export interface RSSFeedConfig {
  id: string;
  name: string;
  url: string;
  defaultSource: string;
}

export const DEFAULT_RSS_FEEDS: RSSFeedConfig[] = [
  {
    id: "zerodha-pulse",
    name: "Zerodha Pulse",
    url: "https://pulse.zerodha.com/feed.xml",
    defaultSource: "Zerodha Pulse",
  },
  {
    id: "google-news-nifty",
    name: "Google News (NIFTY & Indian Markets)",
    url: "https://news.google.com/rss/search?q=NIFTY+50+OR+Indian+stock+market+OR+Sensex&hl=en-IN&gl=IN&ceid=IN:en",
    defaultSource: "Google News",
  },
  {
    id: "economic-times-markets",
    name: "Economic Times Markets",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    defaultSource: "Economic Times",
  },
  {
    id: "moneycontrol-topnews",
    name: "Moneycontrol Top News",
    url: "https://www.moneycontrol.com/rss/MCtopnews.xml",
    defaultSource: "Moneycontrol",
  },
];

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

/**
 * Strip HTML tags, CDATA wrappers, and extra whitespace from text.
 */
function cleanText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize title for deduplication comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Check if two titles are near-duplicates
 */
function isDuplicateTitle(newTitle: string, existingTitles: Set<string>): boolean {
  const normNew = normalizeTitle(newTitle);
  if (normNew.length < 10) return false;

  for (const existing of existingTitles) {
    if (existing === normNew) return true;
    if (normNew.length > 25 && existing.length > 25) {
      if (normNew.includes(existing) || existing.includes(normNew)) {
        return true;
      }
    }
  }
  return false;
}

export interface FetchRSSOptions {
  feeds?: RSSFeedConfig[];
  portfolioTickers?: string[];
  maxArticles?: number;
}

/**
 * Fetch combined news from all configured RSS feeds concurrently
 */
export async function fetchCombinedRssNews(
  options: FetchRSSOptions = {}
): Promise<NewsArticleInput[]> {
  let feedsToFetch = options.feeds || DEFAULT_RSS_FEEDS;
  const maxArticles = options.maxArticles || 25;

  if (options.portfolioTickers && options.portfolioTickers.length > 0) {
    const query = encodeURIComponent(
      options.portfolioTickers.slice(0, 5).join(" OR ") + " stock news India"
    );
    const portfolioFeed: RSSFeedConfig = {
      id: "google-news-portfolio",
      name: "Google News Portfolio",
      url: `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`,
      defaultSource: "Google News (Portfolio)",
    };
    feedsToFetch = [portfolioFeed, ...feedsToFetch];
  }

  console.log(`[RSSService] Fetching from ${feedsToFetch.length} feeds...`);

  const results = await Promise.allSettled(
    feedsToFetch.map(async (feed) => {
      try {
        const feedData = await parser.parseURL(feed.url);
        const items: NewsArticleInput[] = (feedData.items || []).map((item) => {
          const headline = cleanText(item.title);
          const description = cleanText(
            item.contentSnippet || item.content || item.summary
          );

          let source = feed.defaultSource;
          if (item.creator) {
            source = cleanText(item.creator);
          } else if (feedData.title) {
            source = cleanText(feedData.title);
          }

          let timestamp = new Date().toISOString();
          if (item.pubDate) {
            const parsed = new Date(item.pubDate);
            if (!isNaN(parsed.getTime())) {
              timestamp = parsed.toISOString();
            }
          }

          return {
            headline,
            description: description || headline,
            source,
            timestamp,
          };
        });

        console.log(`[RSSService] ✓ ${feed.name}: ${items.length} items`);
        return items;
      } catch (err: any) {
        console.warn(`[RSSService] ⚠️ Failed feed ${feed.name}: ${err.message}`);
        return [] as NewsArticleInput[];
      }
    })
  );

  const allArticles: NewsArticleInput[] = [];
  const seenTitles = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        if (!article.headline || article.headline.length < 5) continue;

        if (!isDuplicateTitle(article.headline, seenTitles)) {
          seenTitles.add(normalizeTitle(article.headline));
          allArticles.push(article);
        }
      }
    }
  }

  allArticles.sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  const finalArticles = allArticles.slice(0, maxArticles);
  console.log(
    `[RSSService] 📰 Total aggregated & deduplicated articles: ${finalArticles.length}`
  );

  return finalArticles;
}
