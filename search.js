// Simple tokenizer
function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

// Simple Porter Stemmer
function stem(word) {
  word = word.toLowerCase();
  
  if (word.endsWith('sses')) word = word.slice(0, -2);
  else if (word.endsWith('ies')) word = word.slice(0, -2);
  else if (word.endsWith('ss')) { /* keep */ }
  else if (word.endsWith('s') && word.length > 3) word = word.slice(0, -1);
  
  if (word.endsWith('eed')) {
    if (word.length > 4) word = word.slice(0, -1);
  } else if (word.endsWith('ed') && word.length > 4) {
    word = word.slice(0, -2);
  } else if (word.endsWith('ing') && word.length > 5) {
    word = word.slice(0, -3);
  }
  
  const suffixes = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['isation', 'ise'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble']
  ];
  
  for (const [suffix, replacement] of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      word = word.slice(0, -suffix.length) + replacement;
      break;
    }
  }
  
  return word;
}

const stopwords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must'
]);

class SearchIndex {
  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.docFrequencies = new Map();
    this.totalDocs = 0;
  }
  
  tokenizeText(text) {
    if (!text) return [];
    const tokens = tokenize(text);
    return tokens
      .filter(token => token.length > 2 && !stopwords.has(token))
      .map(token => stem(token));
  }
  
  addDocument(doc) {
    const id = doc.id;
    
    this.documents.set(id, {
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      url: doc.url || doc.link,
      source: doc.source,
      category: doc.category,
      publishedAt: doc.publishedAt || doc.pubDate,
      image: doc.image
    });
    
    const sourceName = doc.source?.name || doc.source || '';
    const text = `${doc.title} ${doc.summary || ''} ${sourceName}`;
    const tokens = this.tokenizeText(text);
    const tokenSet = new Set(tokens);
    
    for (const token of tokenSet) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token).add(id);
      
      this.docFrequencies.set(token, (this.docFrequencies.get(token) || 0) + 1);
    }
    
    this.totalDocs++;
  }
  
  search(query, options = {}) {
    const { limit = 20, category = null } = options;
    
    if (!query || query.trim() === '') {
      return this.getRecent(limit, { category });
    }
    
    const queryTokens = this.tokenizeText(query);
    
    if (queryTokens.length === 0) {
      return this.getRecent(limit, { category });
    }
    
    const candidates = new Map();
    
    for (const token of queryTokens) {
      const docs = this.invertedIndex.get(token);
      if (docs) {
        const idf = Math.log((this.totalDocs + 1) / (docs.size + 1));
        for (const docId of docs) {
          const current = candidates.get(docId) || 0;
          candidates.set(docId, current + idf);
        }
      }
    }
    
    let results = Array.from(candidates.entries())
      .map(([docId, score]) => ({
        ...this.documents.get(docId),
        score
      }))
      .filter(doc => doc);
    
    if (category) {
      results = results.filter(doc => doc.category === category);
    }
    
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit);
  }
  
  getRecent(limit, options = {}) {
    let docs = Array.from(this.documents.values());
    
    if (options.category) {
      docs = docs.filter(doc => doc.category === options.category);
    }
    
    docs.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return docs.slice(0, limit);
  }
  
  suggest(query, limit = 10) {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    const suggestions = [];
    
    for (const token of this.invertedIndex.keys()) {
      if (token.startsWith(queryLower)) {
        suggestions.push({
          term: token,
          count: this.invertedIndex.get(token).size
        });
      }
    }
    
    suggestions.sort((a, b) => b.count - a.count);
    return suggestions.slice(0, limit).map(s => s.term);
  }
  
  rebuild(articles) {
    this.clear();
    for (const article of articles) {
      this.addDocument(article);
    }
    console.log(`Search index rebuilt with ${this.totalDocs} documents`);
  }
  
  clear() {
    this.documents.clear();
    this.invertedIndex.clear();
    this.docFrequencies.clear();
    this.totalDocs = 0;
  }
  
  getStats() {
    return {
      documents: this.totalDocs,
      terms: this.invertedIndex.size
    };
  }
  
  get size() {
    return this.documents.size;
  }
}

// Search through story clusters
export function searchStoryClusters(clusters, query, options = {}) {
  const { limit = 20, category = null } = options;
  
  if (!query || query.trim() === '') {
    let results = [...clusters];
    if (category) {
      results = results.filter(c => c.category === category);
    }
    return results.slice(0, limit);
  }
  
  const queryTokens = new Set(
    tokenize(query)
      .filter(t => t.length > 2 && !stopwords.has(t))
      .map(t => stem(t))
  );
  
  const scored = clusters.map(cluster => {
    const lead = cluster.lead;
    if (!lead) return { cluster, score: 0 };
    
    const titleTokens = new Set(
      tokenize(lead.title)
        .filter(t => t.length > 2)
        .map(t => stem(t))
    );
    
    let score = 0;
    for (const qt of queryTokens) {
      if (titleTokens.has(qt)) score += 10;
    }
    
    const summary = lead.summary || lead.description || '';
    if (summary) {
      const summaryTokens = new Set(
        tokenize(summary)
          .filter(t => t.length > 2)
          .map(t => stem(t))
      );
      for (const qt of queryTokens) {
        if (summaryTokens.has(qt)) score += 3;
      }
    }
    
    // Boost multi-source clusters
    if (cluster.articleCount > 1) {
      score *= 1.5;
    }
    
    return { cluster, score };
  });
  
  let results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.cluster);
  
  if (category) {
    results = results.filter(c => c.category === category);
  }
  
  return results.slice(0, limit);
}

export const searchIndex = new SearchIndex();
export { SearchIndex };
