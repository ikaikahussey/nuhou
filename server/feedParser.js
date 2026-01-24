import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { sources, categoryKeywords } from './sources.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'HawaiiNewsAggregator/1.0 (+https://hawaiinews.example.com)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['dc:creator', 'creator'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

// Clean HTML from text
function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text().trim();
}

// Extract image from item
function extractImage(item) {
  if (item.media && item.media.$) {
    return item.media.$.url;
  }
  if (item.thumbnail && item.thumbnail.$) {
    return item.thumbnail.$.url;
  }
  if (item.enclosure && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  // Try to extract from content
  if (item.contentEncoded || item.content) {
    const $ = cheerio.load(item.contentEncoded || item.content);
    const img = $('img').first().attr('src');
    if (img) return img;
  }
  return null;
}

// Extract summary/description
function extractSummary(item, maxLength = 300) {
  let text = '';
  
  if (item.contentSnippet) {
    text = item.contentSnippet;
  } else if (item.content) {
    text = stripHtml(item.content);
  } else if (item.summary) {
    text = stripHtml(item.summary);
  } else if (item.description) {
    text = stripHtml(item.description);
  }
  
  // Truncate if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim();
    // Cut at last complete word
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > maxLength - 50) {
      text = text.substring(0, lastSpace);
    }
    text += '...';
  }
  
  return text;
}

// Classify article into categories
function classifyArticle(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const scores = {};
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[category]++;
      }
    }
  }
  
  // Find category with highest score
  let maxScore = 0;
  let topCategory = 'general';
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = category;
    }
  }
  
  // Only assign category if there's a meaningful match
  return maxScore >= 1 ? topCategory : 'general';
}

// Parse a single RSS feed
async function parseFeed(feedUrl, source) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const articles = [];
    
    for (const item of feed.items || []) {
      const title = item.title?.trim();
      if (!title) continue;
      
      const summary = extractSummary(item);
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      
      articles.push({
        id: generateArticleId(item.link || item.guid, source.id),
        title,
        url: item.link || item.guid,
        summary,
        image: extractImage(item),
        author: item.creator || item.author || null,
        publishedAt: pubDate.toISOString(),
        fetchedAt: new Date().toISOString(),
        source: {
          id: source.id,
          name: source.name,
          shortName: source.shortName,
          url: source.url,
          type: source.type,
          region: source.region
        },
        category: classifyArticle(title, summary),
        keywords: extractKeywords(title, summary)
      });
    }
    
    return articles;
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error.message);
    return [];
  }
}

// Generate consistent article ID
function generateArticleId(url, sourceId) {
  const hash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `${sourceId}-${Math.abs(hash).toString(36)}`;
}

// Extract keywords from text for clustering
function extractKeywords(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  
  // Common stopwords to filter out
  const stopwords = new Set([
    'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their',
    'will', 'would', 'could', 'should', 'about', 'after', 'before', 'other',
    'which', 'being', 'more', 'some', 'than', 'when', 'what', 'there', 'into',
    'also', 'said', 'says', 'year', 'years', 'according', 'hawaii', 'hawaiian',
    'honolulu', 'maui', 'oahu', 'kauai', 'island', 'state', 'county', 'city'
  ]);
  
  const filtered = words.filter(w => !stopwords.has(w));
  
  // Count frequency
  const freq = {};
  for (const word of filtered) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  // Return top keywords by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Fetch all feeds from all sources
export async function fetchAllFeeds() {
  const allArticles = [];
  const fetchPromises = [];
  
  for (const source of sources) {
    for (const feedUrl of source.feedUrls) {
      fetchPromises.push(
        parseFeed(feedUrl, source)
          .then(articles => allArticles.push(...articles))
          .catch(err => console.error(`Failed to fetch ${feedUrl}:`, err.message))
      );
    }
  }
  
  await Promise.allSettled(fetchPromises);
  
  // Deduplicate by URL
  const seen = new Set();
  const unique = [];
  
  for (const article of allArticles) {
    if (!seen.has(article.url)) {
      seen.add(article.url);
      unique.push(article);
    }
  }
  
  // Sort by publish date (newest first)
  unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  console.log(`Fetched ${unique.length} unique articles from ${sources.length} sources`);
  return unique;
}

// Fetch feeds for a specific source
export async function fetchSourceFeeds(sourceId) {
  const source = sources.find(s => s.id === sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }
  
  const allArticles = [];
  
  for (const feedUrl of source.feedUrls) {
    const articles = await parseFeed(feedUrl, source);
    allArticles.push(...articles);
  }
  
  return allArticles;
}

export default {
  fetchAllFeeds,
  fetchSourceFeeds,
  parseFeed
};
