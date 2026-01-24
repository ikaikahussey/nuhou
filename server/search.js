import natural from 'natural';

const TfIdf = natural.TfIdf;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

class SearchIndex {
  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.tfidf = new TfIdf();
  }
  
  // Add document to search index
  addDocument(doc) {
    const id = doc.id;
    
    // Store document
    this.documents.set(id, {
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      url: doc.url,
      source: doc.source,
      category: doc.category,
      publishedAt: doc.publishedAt,
      image: doc.image
    });
    
    // Tokenize and index
    const text = `${doc.title} ${doc.summary || ''} ${doc.source?.name || ''}`;
    const tokens = this.tokenize(text);
    
    // Add to inverted index
    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token).add(id);
    }
    
    // Add to TF-IDF
    this.tfidf.addDocument(tokens.join(' '));
  }
  
  // Tokenize and stem text
  tokenize(text) {
    if (!text) return [];
    
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return tokens
      .filter(token => token.length > 2)
      .map(token => stemmer.stem(token));
  }
  
  // Search documents
  search(query, options = {}) {
    const {
      limit = 20,
      category = null,
      source = null,
      fromDate = null,
      toDate = null
    } = options;
    
    if (!query || query.trim() === '') {
      return this.getRecent(limit, { category, source, fromDate, toDate });
    }
    
    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      return this.getRecent(limit, { category, source, fromDate, toDate });
    }
    
    // Find candidate documents using inverted index
    const candidates = new Map();
    
    for (const token of queryTokens) {
      const docs = this.invertedIndex.get(token);
      if (docs) {
        for (const docId of docs) {
          candidates.set(docId, (candidates.get(docId) || 0) + 1);
        }
      }
    }
    
    // Score candidates
    const scored = [];
    
    for (const [docId, tokenMatches] of candidates) {
      const doc = this.documents.get(docId);
      if (!doc) continue;
      
      // Apply filters
      if (category && doc.category !== category) continue;
      if (source && doc.source?.id !== source) continue;
      
      const pubDate = new Date(doc.publishedAt);
      if (fromDate && pubDate < new Date(fromDate)) continue;
      if (toDate && pubDate > new Date(toDate)) continue;
      
      // Calculate relevance score
      let score = 0;
      
      // Token match score (how many query terms matched)
      score += tokenMatches * 10;
      
      // Title match boost
      const titleTokens = new Set(this.tokenize(doc.title));
      const titleMatches = queryTokens.filter(t => titleTokens.has(t)).length;
      score += titleMatches * 20;
      
      // Exact phrase match in title
      if (doc.title.toLowerCase().includes(query.toLowerCase())) {
        score += 50;
      }
      
      // Recency boost (decay over 7 days)
      const ageHours = (Date.now() - pubDate) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 20 - (ageHours / 8));
      score += recencyBoost;
      
      scored.push({ doc, score });
    }
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, limit).map(s => ({
      ...s.doc,
      relevanceScore: s.score
    }));
  }
  
  // Get recent documents (fallback when no query)
  getRecent(limit, filters = {}) {
    const docs = [...this.documents.values()];
    
    // Apply filters
    let filtered = docs;
    
    if (filters.category) {
      filtered = filtered.filter(d => d.category === filters.category);
    }
    if (filters.source) {
      filtered = filtered.filter(d => d.source?.id === filters.source);
    }
    if (filters.fromDate) {
      filtered = filtered.filter(d => new Date(d.publishedAt) >= new Date(filters.fromDate));
    }
    if (filters.toDate) {
      filtered = filtered.filter(d => new Date(d.publishedAt) <= new Date(filters.toDate));
    }
    
    // Sort by date
    filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return filtered.slice(0, limit);
  }
  
  // Suggest search completions
  suggest(prefix, limit = 10) {
    if (!prefix || prefix.length < 2) return [];
    
    const prefixLower = prefix.toLowerCase();
    const suggestions = new Set();
    
    // Search through document titles
    for (const doc of this.documents.values()) {
      const words = doc.title.split(/\s+/);
      for (const word of words) {
        if (word.toLowerCase().startsWith(prefixLower) && word.length > prefix.length) {
          suggestions.add(word);
          if (suggestions.size >= limit) break;
        }
      }
      if (suggestions.size >= limit) break;
    }
    
    return [...suggestions];
  }
  
  // Get index stats
  getStats() {
    return {
      documentCount: this.documents.size,
      termCount: this.invertedIndex.size,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Clear index
  clear() {
    this.documents.clear();
    this.invertedIndex.clear();
    this.tfidf = new TfIdf();
  }
  
  // Rebuild index from articles
  rebuild(articles) {
    this.clear();
    for (const article of articles) {
      this.addDocument(article);
    }
    console.log(`Search index rebuilt with ${this.documents.size} documents`);
  }
}

// Search across story clusters
export function searchStoryClusters(clusters, query, options = {}) {
  const { limit = 20, category = null } = options;
  
  if (!query || query.trim() === '') {
    let results = clusters;
    if (category) {
      results = results.filter(c => c.category === category);
    }
    return results.slice(0, limit);
  }
  
  const queryLower = query.toLowerCase();
  const queryTokens = new Set(queryLower.split(/\s+/).filter(t => t.length > 2));
  
  const scored = clusters.map(cluster => {
    let score = 0;
    
    // Check lead article
    const leadTitle = cluster.lead.title.toLowerCase();
    const leadSummary = (cluster.lead.summary || '').toLowerCase();
    
    // Exact phrase match
    if (leadTitle.includes(queryLower)) {
      score += 100;
    }
    if (leadSummary.includes(queryLower)) {
      score += 50;
    }
    
    // Token matches
    for (const token of queryTokens) {
      if (leadTitle.includes(token)) score += 20;
      if (leadSummary.includes(token)) score += 10;
    }
    
    // Check related articles
    for (const related of cluster.related) {
      const relatedTitle = related.title.toLowerCase();
      if (relatedTitle.includes(queryLower)) {
        score += 30;
      }
      for (const token of queryTokens) {
        if (relatedTitle.includes(token)) score += 5;
      }
    }
    
    // Cluster size boost
    score += cluster.articleCount * 2;
    
    return { cluster, score };
  });
  
  // Filter by category if specified
  let filtered = scored;
  if (category) {
    filtered = scored.filter(s => s.cluster.category === category);
  }
  
  // Filter to only matching results
  filtered = filtered.filter(s => s.score > 0);
  
  // Sort by score
  filtered.sort((a, b) => b.score - a.score);
  
  return filtered.slice(0, limit).map(s => ({
    ...s.cluster,
    searchScore: s.score
  }));
}

// Create singleton search index
export const searchIndex = new SearchIndex();

export default {
  SearchIndex,
  searchIndex,
  searchStoryClusters
};
