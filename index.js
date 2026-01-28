import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllFeeds } from './feedParser.js';
import { clusterArticles, getTopStories, filterByCategory } from './clustering.js';
import { searchIndex, searchStoryClusters } from './search.js';
import { dataStore } from './cache.js';
import { sources, categoryKeywords } from './sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

// Initial load
console.log('Performing initial data load...');
await refreshFeeds();

// Schedule periodic refreshes
setInterval(refreshFeeds, 5 * 60 * 1000);  // Every 5 minutes

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
    const { category, tag, limit = 30 } = req.query;
    
    let clusters = await dataStore.getClusters();
    const tagOverrides = await dataStore.getTagOverrides();
    
    // Apply tag overrides to clusters
    clusters = clusters.map(cluster => {
      const override = tagOverrides[cluster.id];
      if (override) {
        return { ...cluster, tag: override.tag, tagOverride: true };
      }
      // Use category as default tag if no override
      return { ...cluster, tag: cluster.category || 'general' };
    });
    
    // Filter by tag if specified
    if (tag && tag !== 'all') {
      clusters = clusters.filter(c => c.tag === tag);
    } else if (category && category !== 'all') {
      clusters = filterByCategory(clusters, category);
    }
    
    const topStories = getTopStories(clusters, parseInt(limit));
    
    // Get all unique tags
    const allClusters = await dataStore.getClusters();
    const allTags = new Set(['all']);
    allClusters.forEach(c => {
      const override = tagOverrides[c.id];
      allTags.add(override ? override.tag : (c.category || 'general'));
    });
    
    res.json({
      stories: topStories,
      tags: Array.from(allTags).sort(),
      meta: {
        total: clusters.length,
        returned: topStories.length,
        category: category || 'all',
        tag: tag || 'all',
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

// ============================================
// Tag Management
// ============================================

// Get all tags
app.get('/api/tags', async (req, res) => {
  try {
    const clusters = await dataStore.getClusters();
    const tagOverrides = await dataStore.getTagOverrides();
    
    // Collect all tags (from categories and overrides)
    const tagCounts = {};
    
    clusters.forEach(cluster => {
      const override = tagOverrides[cluster.id];
      const tag = override ? override.tag : (cluster.category || 'general');
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Update tag for a story
app.put('/api/stories/:storyId/tag', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { tag } = req.body;
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    // Validate tag (alphanumeric, lowercase, hyphens allowed)
    const cleanTag = tag.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    
    if (cleanTag.length < 2 || cleanTag.length > 30) {
      return res.status(400).json({ error: 'Tag must be 2-30 characters' });
    }
    
    // Verify story exists
    const clusters = await dataStore.getClusters();
    const cluster = clusters.find(c => c.id === storyId);
    
    if (!cluster) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    await dataStore.setTagOverride(storyId, cleanTag);
    
    res.json({
      success: true,
      storyId,
      tag: cleanTag,
      message: `Story tagged as "${cleanTag}"`
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Remove tag override (revert to auto-detected category)
app.delete('/api/stories/:storyId/tag', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    await dataStore.removeTagOverride(storyId);
    
    res.json({
      success: true,
      storyId,
      message: 'Tag override removed'
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
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
      sources: sourcesWithStatus
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
  
  res.json({ message: 'Refresh started', status: 'pending' });
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const articles = await dataStore.getArticles();
    const clusters = await dataStore.getClusters();
    
    // Count by source
    const bySource = {};
    for (const article of articles) {
      const sourceId = article.source?.id || 'unknown';
      bySource[sourceId] = (bySource[sourceId] || 0) + 1;
    }
    
    // Count by category
    const byCategory = {};
    for (const article of articles) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }
    
    res.json({
      articleCount: articles.length,
      sourceCount: Object.keys(bySource).length,
      clusterCount: clusters.length,
      articles: {
        total: articles.length,
        bySource,
        byCategory
      },
      clusters: {
        total: clusters.length,
        multiSource: clusters.filter(c => c.articleCount > 1).length
      },
      lastRefresh,
      isRefreshing
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Catch-all route for SPA - serve index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
