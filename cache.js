import NodeCache from 'node-cache';
import fs from 'fs/promises';
import path from 'path';

// In-memory cache with TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60
});

// Cache keys
const CACHE_KEYS = {
  ARTICLES: 'articles',
  CLUSTERS: 'clusters',
  SOCIAL: 'social',
  TRENDING: 'trending',
  SOURCES_STATUS: 'sources_status',
  TAG_OVERRIDES: 'tag_overrides'
};

// Data directory for file-based persistence
const DATA_DIR = './data';

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory may already exist
  }
}

// Save data to file
async function saveToFile(filename, data) {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

// Load data from file
async function loadFromFile(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Cache wrapper with file backup
class DataStore {
  constructor() {
    this.cache = cache;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    await ensureDataDir();
    
    // Load cached data from files on startup
    const articles = await loadFromFile('articles.json');
    if (articles) {
      this.cache.set(CACHE_KEYS.ARTICLES, articles, 600);
      console.log(`Loaded ${articles.length} articles from file cache`);
    }
    
    const clusters = await loadFromFile('clusters.json');
    if (clusters) {
      this.cache.set(CACHE_KEYS.CLUSTERS, clusters, 600);
      console.log(`Loaded ${clusters.length} clusters from file cache`);
    }
    
    const social = await loadFromFile('social.json');
    if (social) {
      this.cache.set(CACHE_KEYS.SOCIAL, social, 300);
    }
    
    this.initialized = true;
  }
  
  // Articles
  async getArticles() {
    let articles = this.cache.get(CACHE_KEYS.ARTICLES);
    if (!articles) {
      articles = await loadFromFile('articles.json');
      if (articles) {
        this.cache.set(CACHE_KEYS.ARTICLES, articles, 600);
      }
    }
    return articles || [];
  }
  
  async setArticles(articles) {
    this.cache.set(CACHE_KEYS.ARTICLES, articles, 600);
    await saveToFile('articles.json', articles);
  }
  
  // Story clusters
  async getClusters() {
    let clusters = this.cache.get(CACHE_KEYS.CLUSTERS);
    if (!clusters) {
      clusters = await loadFromFile('clusters.json');
      if (clusters) {
        this.cache.set(CACHE_KEYS.CLUSTERS, clusters, 600);
      }
    }
    return clusters || [];
  }
  
  async setClusters(clusters) {
    this.cache.set(CACHE_KEYS.CLUSTERS, clusters, 600);
    await saveToFile('clusters.json', clusters);
  }
  
  // Social content
  async getSocial() {
    let social = this.cache.get(CACHE_KEYS.SOCIAL);
    if (!social) {
      social = await loadFromFile('social.json');
      if (social) {
        this.cache.set(CACHE_KEYS.SOCIAL, social, 300);
      }
    }
    return social || { twitter: [], reddit: [] };
  }
  
  async setSocial(social) {
    this.cache.set(CACHE_KEYS.SOCIAL, social, 300);
    await saveToFile('social.json', social);
  }
  
  // Source status tracking
  async getSourceStatus() {
    return this.cache.get(CACHE_KEYS.SOURCES_STATUS) || {};
  }
  
  async updateSourceStatus(sourceId, status) {
    const current = await this.getSourceStatus();
    current[sourceId] = {
      ...status,
      lastUpdated: new Date().toISOString()
    };
    this.cache.set(CACHE_KEYS.SOURCES_STATUS, current, 3600);
  }
  
  // Trending topics
  async getTrending() {
    return this.cache.get(CACHE_KEYS.TRENDING) || [];
  }
  
  async setTrending(trending) {
    this.cache.set(CACHE_KEYS.TRENDING, trending, 300);
  }
  
  // Tag overrides - user-specified tags for stories
  async getTagOverrides() {
    let overrides = this.cache.get(CACHE_KEYS.TAG_OVERRIDES);
    if (!overrides) {
      overrides = await loadFromFile('tag_overrides.json');
      if (overrides) {
        this.cache.set(CACHE_KEYS.TAG_OVERRIDES, overrides, 86400); // 24 hours
      }
    }
    return overrides || {};
  }
  
  async setTagOverride(storyId, tag) {
    const overrides = await this.getTagOverrides();
    overrides[storyId] = {
      tag,
      updatedAt: new Date().toISOString()
    };
    this.cache.set(CACHE_KEYS.TAG_OVERRIDES, overrides, 86400);
    await saveToFile('tag_overrides.json', overrides);
    return overrides;
  }
  
  async removeTagOverride(storyId) {
    const overrides = await this.getTagOverrides();
    delete overrides[storyId];
    this.cache.set(CACHE_KEYS.TAG_OVERRIDES, overrides, 86400);
    await saveToFile('tag_overrides.json', overrides);
    return overrides;
  }
  
  // Stats
  getStats() {
    return {
      keys: this.cache.keys(),
      stats: this.cache.getStats()
    };
  }
  
  // Clear all caches
  async clear() {
    this.cache.flushAll();
    try {
      await fs.rm(DATA_DIR, { recursive: true, force: true });
      await ensureDataDir();
    } catch (error) {
      console.error('Error clearing data directory:', error);
    }
  }
}

// Singleton instance
export const dataStore = new DataStore();

export default {
  dataStore,
  CACHE_KEYS
};
