import express from 'express';
import cors from 'cors';
import { fetchAllFeeds } from './feedParser.js';
import { clusterArticles, getTopStories, filterByCategory } from './clustering.js';
import { fetchSocialContent, getTrendingTopics, filterNewsRelevant } from './socialAggregator.js';
import { searchIndex, searchStoryClusters } from './search.js';
import { dataStore } from './cache.js';
import { sources, socialSources, categoryKeywords } from './sources.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize data store
await dataStore.initialize();

// ============================================
// Background Jobs
// ============================================

let isRefreshing = false;
let lastRefresh = null;

async function refreshFeeds() {
  if (isRefreshing) {
    console.log('Refresh already in progress, skipping...');
    return;
  }
  
  isRefreshing = true;
  console.log('Starting feed refresh...');
  
  try {
    // Fetch all RSS feeds
    const articles = await fetchAllFeeds();
    await dataStore.setArticles(articles);
    
    // Rebuild search index
    searchIndex.rebuild(articles);
    
    // Cluster articles into stories
    const clusters = clusterArticles(articles);
    await dataStore.setClusters(clusters);
    
    // Update source status
    const sourceStats = {};
    for (const article of articles) {
      const sourceId = article.source.id;
      if (!sourceStats[sourceId]) {
        sourceStats[sourceId] = { count: 0, latest: null };
      }
      sourceStats[sourceId].count++;
      if (!sourceStats[sourceId].latest || article.publishedAt > sourceStats[sourceId].latest) {
        sourceStats[sourceId].latest = article.publishedAt;
      }
    }
    
    for (const [sourceId, stats] of Object.entries(sourceStats)) {
      await dataStore.updateSourceStatus(sourceId, {
        articleCount: stats.count,
        latestArticle: stats.latest,
        status: 'ok'
      });
    }
    
    lastRefresh = new Date().toISOString();
    console.log(`Feed refresh complete. ${articles.length} articles, ${clusters.length} clusters`);
  } catch (error) {
    console.error('Feed refresh error:', error);
  } finally {
    isRefreshing = false;
  }
}

async function refreshSocial() {
  console.log('Starting social media refresh...');
  
  try {
    const twitterCredentials = process.env.TWITTER_BEARER_TOKEN ? {
      bearerToken: process.env.TWITTER_BEARER_TOKEN
    } : null;
    
    const social = await fetchSocialContent(twitterCredentials);
    await dataStore.setSocial(social);
    
    const trending = getTrendingTopics(social);
    await dataStore.setTrending(trending);
    
    console.log(`Social refresh complete. ${social.twitter.length} tweets, ${social.reddit.length} Reddit posts`);
  } catch (error) {
    console.error('Social refresh error:', error);
  }
}

// Initial load
console.log('Performing initial data load...');
await refreshFeeds();
await refreshSocial();

// Schedule periodic refreshes
setInterval(refreshFeeds, 5 * 60 * 1000);  // Every 5 minutes
setInterval(refreshSocial, 3 * 60 * 1000); // Every 3 minutes

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    lastRefresh,
    isRefreshing,
    cacheStats: dataStore.getStats()
  });
});

// Get top stories (clustered)
app.get('/api/stories', async (req, res) => {
  try {
    const { category, limit = 30 } = req.query;
    
    let clusters = await dataStore.getClusters();
    
    if (category && category !== 'all') {
      clusters = filterByCategory(clusters, category);
    }
    
    const topStories = getTopStories(clusters, parseInt(limit));
    
    res.json({
      stories: topStories,
      meta: {
        total: clusters.length,
        returned: topStories.length,
        category: category || 'all',
        lastUpdated: lastRefresh
      }
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get lead stories (most important)
app.get('/api/stories/lead', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const clusters = await dataStore.getClusters();
    const topStories = getTopStories(clusters, parseInt(limit));
    
    // Filter to only multi-source stories for lead
    const leadStories = topStories.filter(s => s.articleCount > 1).slice(0, parseInt(limit));
    
    res.json({
      stories: leadStories,
      meta: { count: leadStories.length }
    });
  } catch (error) {
    console.error('Error fetching lead stories:', error);
    res.status(500).json({ error: 'Failed to fetch lead stories' });
  }
});

// Get stories by category
app.get('/api/stories/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;
    
    const clusters = await dataStore.getClusters();
    const filtered = filterByCategory(clusters, category);
    const stories = getTopStories(filtered, parseInt(limit));
    
    res.json({
      category,
      stories,
      meta: { total: filtered.length, returned: stories.length }
    });
  } catch (error) {
    console.error('Error fetching category stories:', error);
    res.status(500).json({ error: 'Failed to fetch category stories' });
  }
});

// Search stories
app.get('/api/search', async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        query: '',
        results: [],
        meta: { total: 0 }
      });
    }
    
    const clusters = await dataStore.getClusters();
    const results = searchStoryClusters(clusters, q, {
      limit: parseInt(limit),
      category: category !== 'all' ? category : null
    });
    
    res.json({
      query: q,
      results,
      meta: {
        total: results.length,
        category: category || 'all'
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search suggestions
app.get('/api/search/suggest', async (req, res) => {
  try {
    const { q } = req.query;
    const suggestions = searchIndex.suggest(q, 10);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ error: 'Suggestion failed' });
  }
});

// Get social content
app.get('/api/social', async (req, res) => {
  try {
    const { platform, limit = 30, newsOnly = false } = req.query;
    
    let social = await dataStore.getSocial();
    
    if (newsOnly === 'true') {
      social = filterNewsRelevant(social);
    }
    
    let result = {};
    
    if (!platform || platform === 'all') {
      result = {
        twitter: social.twitter.slice(0, parseInt(limit)),
        reddit: social.reddit.slice(0, parseInt(limit))
      };
    } else if (platform === 'twitter') {
      result = { twitter: social.twitter.slice(0, parseInt(limit)) };
    } else if (platform === 'reddit') {
      result = { reddit: social.reddit.slice(0, parseInt(limit)) };
    }
    
    res.json({
      ...result,
      meta: {
        fetchedAt: social.fetchedAt,
        platform: platform || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching social:', error);
    res.status(500).json({ error: 'Failed to fetch social content' });
  }
});

// Get trending topics
app.get('/api/trending', async (req, res) => {
  try {
    const trending = await dataStore.getTrending();
    res.json({ trending });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// Get all articles (raw, unclustered)
app.get('/api/articles', async (req, res) => {
  try {
    const { source, category, limit = 50, offset = 0 } = req.query;
    
    let articles = await dataStore.getArticles();
    
    if (source) {
      articles = articles.filter(a => a.source.id === source);
    }
    
    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }
    
    const total = articles.length;
    const paginated = articles.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      articles: paginated,
      meta: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article by ID
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const articles = await dataStore.getArticles();
    const article = articles.find(a => a.id === id);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json({ article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Get sources list
app.get('/api/sources', async (req, res) => {
  try {
    const status = await dataStore.getSourceStatus();
    
    const sourcesWithStatus = sources.map(source => ({
      ...source,
      status: status[source.id] || { status: 'unknown' }
    }));
    
    res.json({
      sources: sourcesWithStatus,
      social: socialSources
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get categories
app.get('/api/categories', (req, res) => {
  const categories = Object.keys(categoryKeywords).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    keywordCount: categoryKeywords[key].length
  }));
  
  categories.unshift({ id: 'all', name: 'All Stories', keywordCount: 0 });
  
  res.json({ categories });
});

// Force refresh (admin endpoint)
app.post('/api/refresh', async (req, res) => {
  if (isRefreshing) {
    return res.status(409).json({ error: 'Refresh already in progress' });
  }
  
  // Run async, don't wait
  refreshFeeds();
  refreshSocial();
  
  res.json({ message: 'Refresh started', status: 'pending' });
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const articles = await dataStore.getArticles();
    const clusters = await dataStore.getClusters();
    const social = await dataStore.getSocial();
    
    // Count by source
    const bySource = {};
    for (const article of articles) {
      const sourceId = article.source.id;
      bySource[sourceId] = (bySource[sourceId] || 0) + 1;
    }
    
    // Count by category
    const byCategory = {};
    for (const article of articles) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }
    
    res.json({
      articles: {
        total: articles.length,
        bySource,
        byCategory
      },
      clusters: {
        total: clusters.length,
        multiSource: clusters.filter(c => c.articleCount > 1).length
      },
      social: {
        twitter: social.twitter?.length || 0,
        reddit: social.reddit?.length || 0
      },
      search: searchIndex.getStats(),
      lastRefresh,
      isRefreshing
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Hawaii News API server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
