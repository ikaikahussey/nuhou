import natural from 'natural';

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Stopwords for better TF-IDF
const stopwords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'they', 'their',
  'them', 'we', 'our', 'us', 'he', 'she', 'him', 'her', 'his', 'hers', 'i', 'me',
  'my', 'you', 'your', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'said', 'says', 'say', 'according', 'year', 'years', 'new', 'first', 'last',
  'long', 'great', 'little', 'own', 'right', 'old', 'big', 'high', 'different',
  'small', 'large', 'next', 'early', 'young', 'important', 'public', 'bad', 'good'
]);

// Preprocess text for comparison
function preprocessText(text) {
  if (!text) return [];
  
  const tokens = tokenizer.tokenize(text.toLowerCase());
  return tokens
    .filter(token => token.length > 2 && !stopwords.has(token))
    .map(token => stemmer.stem(token));
}

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Calculate cosine similarity between two TF-IDF vectors
function cosineSimilarity(vec1, vec2) {
  const terms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const term of terms) {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Extract named entities (simple approach)
function extractEntities(text) {
  if (!text) return [];
  
  // Match capitalized words/phrases
  const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const matches = text.match(entityPattern) || [];
  
  // Filter common non-entities
  const nonEntities = new Set([
    'The', 'A', 'An', 'In', 'On', 'At', 'For', 'With', 'By', 'From',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December', 'Today', 'Yesterday', 'Tomorrow'
  ]);
  
  return matches.filter(e => !nonEntities.has(e));
}

// Calculate overall similarity between two articles
function calculateSimilarity(article1, article2) {
  // Don't cluster articles from the same source
  if (article1.source.id === article2.source.id) {
    return 0;
  }
  
  // Time penalty - articles far apart in time are less likely to be related
  const timeDiff = Math.abs(new Date(article1.publishedAt) - new Date(article2.publishedAt));
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  const timePenalty = Math.max(0, 1 - (hoursDiff / 72)); // Decay over 72 hours
  
  if (timePenalty === 0) return 0;
  
  // Title similarity (weighted heavily)
  const title1Tokens = new Set(preprocessText(article1.title));
  const title2Tokens = new Set(preprocessText(article2.title));
  const titleSimilarity = jaccardSimilarity(title1Tokens, title2Tokens);
  
  // Summary/content similarity
  const text1 = `${article1.title} ${article1.summary}`;
  const text2 = `${article2.title} ${article2.summary}`;
  const text1Tokens = new Set(preprocessText(text1));
  const text2Tokens = new Set(preprocessText(text2));
  const textSimilarity = jaccardSimilarity(text1Tokens, text2Tokens);
  
  // Entity overlap
  const entities1 = new Set(extractEntities(text1));
  const entities2 = new Set(extractEntities(text2));
  const entitySimilarity = jaccardSimilarity(entities1, entities2);
  
  // Keyword overlap (from pre-extracted keywords)
  const keywords1 = new Set(article1.keywords || []);
  const keywords2 = new Set(article2.keywords || []);
  const keywordSimilarity = jaccardSimilarity(keywords1, keywords2);
  
  // Category match bonus
  const categoryBonus = article1.category === article2.category ? 0.1 : 0;
  
  // Weighted combination
  const baseSimilarity = (
    titleSimilarity * 0.4 +
    textSimilarity * 0.25 +
    entitySimilarity * 0.2 +
    keywordSimilarity * 0.15 +
    categoryBonus
  );
  
  return baseSimilarity * timePenalty;
}

// Cluster articles into story groups
export function clusterArticles(articles, options = {}) {
  const {
    similarityThreshold = 0.25,
    maxClusterSize = 10,
    maxAgeHours = 72
  } = options;
  
  // Filter to recent articles
  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  const recentArticles = articles.filter(a => 
    new Date(a.publishedAt).getTime() > cutoffTime
  );
  
  // Build similarity matrix
  const n = recentArticles.length;
  const similarities = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = calculateSimilarity(recentArticles[i], recentArticles[j]);
      if (sim >= similarityThreshold) {
        similarities.push({ i, j, similarity: sim });
      }
    }
  }
  
  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Greedy clustering
  const clusters = [];
  const assigned = new Set();
  
  for (const { i, j, similarity } of similarities) {
    if (assigned.has(i) && assigned.has(j)) continue;
    
    // Find existing clusters containing i or j
    let clusterI = clusters.find(c => c.articleIndices.has(i));
    let clusterJ = clusters.find(c => c.articleIndices.has(j));
    
    if (clusterI && clusterJ) {
      // Both in different clusters - don't merge to keep clusters focused
      continue;
    } else if (clusterI) {
      // Add j to cluster containing i
      if (clusterI.articleIndices.size < maxClusterSize) {
        clusterI.articleIndices.add(j);
        assigned.add(j);
      }
    } else if (clusterJ) {
      // Add i to cluster containing j
      if (clusterJ.articleIndices.size < maxClusterSize) {
        clusterJ.articleIndices.add(i);
        assigned.add(i);
      }
    } else {
      // Create new cluster
      const newCluster = {
        articleIndices: new Set([i, j]),
        maxSimilarity: similarity
      };
      clusters.push(newCluster);
      assigned.add(i);
      assigned.add(j);
    }
  }
  
  // Convert clusters to story groups
  const storyGroups = clusters.map(cluster => {
    const clusterArticles = [...cluster.articleIndices].map(i => recentArticles[i]);
    
    // Sort by source priority, then by date
    clusterArticles.sort((a, b) => {
      const priorityDiff = (a.source.priority || 99) - (b.source.priority || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    
    const leadArticle = clusterArticles[0];
    const relatedArticles = clusterArticles.slice(1);
    
    return {
      id: `cluster-${leadArticle.id}`,
      lead: leadArticle,
      related: relatedArticles,
      category: leadArticle.category,
      articleCount: clusterArticles.length,
      latestUpdate: new Date(Math.max(...clusterArticles.map(a => new Date(a.publishedAt)))).toISOString(),
      sources: [...new Set(clusterArticles.map(a => a.source.shortName))]
    };
  });
  
  // Add unclustered articles as single-article groups
  const unclusteredArticles = recentArticles.filter((_, i) => !assigned.has(i));
  
  for (const article of unclusteredArticles) {
    storyGroups.push({
      id: `single-${article.id}`,
      lead: article,
      related: [],
      category: article.category,
      articleCount: 1,
      latestUpdate: article.publishedAt,
      sources: [article.source.shortName]
    });
  }
  
  // Sort story groups by latest update time, then by article count
  storyGroups.sort((a, b) => {
    const countDiff = b.articleCount - a.articleCount;
    if (countDiff !== 0 && (a.articleCount > 2 || b.articleCount > 2)) {
      return countDiff;
    }
    return new Date(b.latestUpdate) - new Date(a.latestUpdate);
  });
  
  return storyGroups;
}

// Score story importance for ranking
export function scoreStoryImportance(storyGroup) {
  let score = 0;
  
  // More sources = more important
  score += storyGroup.articleCount * 10;
  
  // Recency boost
  const ageHours = (Date.now() - new Date(storyGroup.latestUpdate)) / (1000 * 60 * 60);
  score += Math.max(0, 50 - ageHours);
  
  // Category importance weights
  const categoryWeights = {
    emergency: 30,
    politics: 20,
    business: 15,
    environment: 15,
    military: 10,
    community: 10,
    general: 5
  };
  score += categoryWeights[storyGroup.category] || 5;
  
  // Source priority boost
  const sourcePriority = storyGroup.lead.source.priority || 3;
  score += (4 - sourcePriority) * 5;
  
  return score;
}

// Get top stories ranked by importance
export function getTopStories(storyGroups, limit = 20) {
  const scored = storyGroups.map(group => ({
    ...group,
    importanceScore: scoreStoryImportance(group)
  }));
  
  scored.sort((a, b) => b.importanceScore - a.importanceScore);
  
  return scored.slice(0, limit);
}

// Filter stories by category
export function filterByCategory(storyGroups, category) {
  if (!category || category === 'all') {
    return storyGroups;
  }
  return storyGroups.filter(group => group.category === category);
}

export default {
  clusterArticles,
  scoreStoryImportance,
  getTopStories,
  filterByCategory
};
