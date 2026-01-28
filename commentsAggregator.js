// Comments Aggregator - pulls comments from Reddit and news sites
import { load } from 'cheerio';

// ============================================
// Reddit Comments
// ============================================

async function fetchRedditComments(postUrl, limit = 10) {
  try {
    // Convert Reddit URL to JSON endpoint
    const jsonUrl = postUrl.replace(/\/$/, '') + '.json?limit=100';
    
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'HawaiiNewsAggregator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Reddit returns [post, comments] array
    if (!Array.isArray(data) || data.length < 2) {
      return [];
    }
    
    const commentsData = data[1]?.data?.children || [];
    
    const comments = commentsData
      .filter(c => c.kind === 't1' && c.data.body && c.data.body !== '[deleted]')
      .map(c => ({
        id: c.data.id,
        author: c.data.author,
        body: c.data.body,
        score: c.data.score,
        created: new Date(c.data.created_utc * 1000).toISOString(),
        permalink: `https://reddit.com${c.data.permalink}`,
        source: 'reddit',
        isOp: c.data.is_submitter,
        awards: c.data.total_awards_received || 0,
        // Calculate usefulness score
        usefulnessScore: calculateRedditUsefulnessScore(c.data)
      }))
      .sort((a, b) => b.usefulnessScore - a.usefulnessScore)
      .slice(0, limit);
    
    return comments;
  } catch (error) {
    console.error('Error fetching Reddit comments:', error.message);
    return [];
  }
}

function calculateRedditUsefulnessScore(comment) {
  let score = 0;
  
  // Base score from upvotes (logarithmic to prevent dominance)
  score += Math.log(Math.max(1, comment.score + 1)) * 10;
  
  // Bonus for awards
  score += (comment.total_awards_received || 0) * 5;
  
  // Bonus for OP responses (often clarifying)
  if (comment.is_submitter) score += 15;
  
  // Prefer medium-length comments (not too short, not too long)
  const bodyLength = (comment.body || '').length;
  if (bodyLength > 50 && bodyLength < 500) score += 10;
  if (bodyLength > 100 && bodyLength < 300) score += 5;
  
  // Penalize very short comments
  if (bodyLength < 20) score -= 10;
  
  // Bonus for comments with links (often sources)
  if (comment.body && comment.body.includes('http')) score += 5;
  
  // Penalize comments that are likely jokes or memes
  const jokeIndicators = ['lol', 'lmao', 'rofl', '😂', '🤣', 'haha'];
  const lowerBody = (comment.body || '').toLowerCase();
  if (jokeIndicators.some(j => lowerBody.includes(j))) score -= 5;
  
  return score;
}

// ============================================
// News Site Comments (via scraping)
// ============================================

// Comment selectors for various Hawaii news sites
const COMMENT_SELECTORS = {
  'civilbeat.org': {
    container: '.comments-section, #comments, .coral-talk',
    comment: '.comment, .coral-comment',
    author: '.comment-author, .coral-author',
    body: '.comment-body, .coral-body',
    time: '.comment-time, time'
  },
  'staradvertiser.com': {
    container: '#comments, .comments',
    comment: '.comment',
    author: '.comment-author',
    body: '.comment-content',
    time: '.comment-date'
  },
  'khon2.com': {
    container: '.comments-area',
    comment: '.comment',
    author: '.comment-author',
    body: '.comment-content',
    time: '.comment-time'
  },
  'hawaiinewsnow.com': {
    container: '.comments',
    comment: '.comment',
    author: '.fn',
    body: '.comment-body',
    time: '.comment-time'
  }
};

async function fetchNewsComments(articleUrl, limit = 5) {
  try {
    const domain = new URL(articleUrl).hostname.replace('www.', '');
    const selectors = COMMENT_SELECTORS[domain];
    
    if (!selectors) {
      return []; // No selectors for this site
    }
    
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HawaiiNewsBot/1.0)',
        'Accept': 'text/html'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      return [];
    }
    
    const html = await response.text();
    const $ = load(html);
    
    const comments = [];
    
    $(selectors.comment).each((i, el) => {
      if (i >= limit) return false;
      
      const $el = $(el);
      const author = $el.find(selectors.author).text().trim() || 'Anonymous';
      const body = $el.find(selectors.body).text().trim();
      const time = $el.find(selectors.time).text().trim();
      
      if (body && body.length > 10) {
        comments.push({
          id: `news-${domain}-${i}`,
          author,
          body: body.slice(0, 1000), // Limit length
          created: time,
          source: domain,
          permalink: articleUrl,
          usefulnessScore: calculateNewsCommentScore(body)
        });
      }
    });
    
    return comments.sort((a, b) => b.usefulnessScore - a.usefulnessScore);
  } catch (error) {
    console.error('Error fetching news comments:', error.message);
    return [];
  }
}

function calculateNewsCommentScore(body) {
  let score = 10; // Base score
  
  const length = body.length;
  
  // Prefer substantive comments
  if (length > 50 && length < 500) score += 10;
  if (length > 100 && length < 300) score += 5;
  
  // Penalize very short
  if (length < 30) score -= 10;
  
  // Bonus for comments with specific indicators of substance
  const substantiveWords = ['because', 'however', 'therefore', 'according', 'source', 'evidence'];
  const lowerBody = body.toLowerCase();
  substantiveWords.forEach(word => {
    if (lowerBody.includes(word)) score += 3;
  });
  
  return score;
}

// ============================================
// Hacker News (for tech-related Hawaii stories)
// ============================================

async function searchHackerNews(query, limit = 5) {
  try {
    const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    const results = [];
    
    for (const hit of (data.hits || []).slice(0, 3)) {
      if (hit.num_comments > 0) {
        const comments = await fetchHNComments(hit.objectID, limit);
        if (comments.length > 0) {
          results.push({
            storyTitle: hit.title,
            storyUrl: hit.url,
            hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            points: hit.points,
            comments
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching HN:', error.message);
    return [];
  }
}

async function fetchHNComments(storyId, limit = 5) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=50`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return (data.hits || [])
      .filter(c => c.comment_text && c.comment_text.length > 20)
      .map(c => ({
        id: c.objectID,
        author: c.author,
        body: c.comment_text.replace(/<[^>]*>/g, ''), // Strip HTML
        created: c.created_at,
        points: c.points || 0,
        source: 'hackernews',
        permalink: `https://news.ycombinator.com/item?id=${c.objectID}`,
        usefulnessScore: (c.points || 0) + (c.comment_text.length > 100 ? 10 : 0)
      }))
      .sort((a, b) => b.usefulnessScore - a.usefulnessScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching HN comments:', error.message);
    return [];
  }
}

// ============================================
// Main Comment Aggregation
// ============================================

async function getCommentsForArticle(article, options = {}) {
  const { limit = 5, includeNews = true, includeReddit = true } = options;
  
  const comments = {
    articleId: article.id,
    articleTitle: article.title,
    comments: [],
    sources: []
  };
  
  // If it's a Reddit post, fetch its comments directly
  if (article.link && article.link.includes('reddit.com')) {
    const redditComments = await fetchRedditComments(article.link, limit);
    if (redditComments.length > 0) {
      comments.comments.push(...redditComments);
      comments.sources.push('reddit');
    }
  }
  
  // Try to fetch comments from the news site
  if (includeNews && article.link && !article.link.includes('reddit.com')) {
    const newsComments = await fetchNewsComments(article.link, limit);
    if (newsComments.length > 0) {
      comments.comments.push(...newsComments);
      comments.sources.push('news');
    }
  }
  
  // Search Reddit for discussions about this article
  if (includeReddit && !article.link?.includes('reddit.com')) {
    const redditDiscussions = await searchRedditForArticle(article.title, limit);
    if (redditDiscussions.length > 0) {
      comments.comments.push(...redditDiscussions);
      if (!comments.sources.includes('reddit')) {
        comments.sources.push('reddit');
      }
    }
  }
  
  // Sort all comments by usefulness
  comments.comments.sort((a, b) => b.usefulnessScore - a.usefulnessScore);
  comments.comments = comments.comments.slice(0, limit * 2); // Keep top comments
  
  return comments;
}

async function searchRedditForArticle(title, limit = 5) {
  try {
    // Search Hawaii subreddits for discussions about this article
    const searchTerms = extractSearchTerms(title);
    const subreddits = ['Hawaii', 'Honolulu', 'maui', 'BigIsland', 'kauai'];
    
    const allComments = [];
    
    for (const subreddit of subreddits.slice(0, 2)) { // Limit API calls
      const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&limit=3&sort=relevance`;
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'HawaiiNewsAggregator/1.0' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const posts = data?.data?.children || [];
      
      for (const post of posts.slice(0, 2)) {
        if (post.data.num_comments > 0) {
          const postUrl = `https://reddit.com${post.data.permalink}`;
          const comments = await fetchRedditComments(postUrl, Math.ceil(limit / 2));
          
          comments.forEach(c => {
            c.relatedPost = {
              title: post.data.title,
              url: postUrl,
              subreddit: post.data.subreddit
            };
          });
          
          allComments.push(...comments);
        }
      }
    }
    
    return allComments
      .sort((a, b) => b.usefulnessScore - a.usefulnessScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching Reddit:', error.message);
    return [];
  }
}

function extractSearchTerms(title) {
  // Extract key terms from title for searching
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'hawaii', 'hawaiian', 'honolulu'
  ]);
  
  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
  
  // Return top 4-5 most likely unique terms
  return words.slice(0, 5).join(' ');
}

// ============================================
// Batch Processing for Clusters
// ============================================

async function getCommentsForCluster(cluster, options = {}) {
  const { limit = 10, maxArticles = 3 } = options;
  
  const clusterComments = {
    clusterId: cluster.id,
    clusterTitle: cluster.title || cluster.lead?.title,
    articles: [],
    topComments: []
  };
  
  const articles = [cluster.lead, ...(cluster.articles || [])].filter(Boolean);
  
  for (const article of articles.slice(0, maxArticles)) {
    const articleComments = await getCommentsForArticle(article, { 
      limit: Math.ceil(limit / maxArticles) 
    });
    
    if (articleComments.comments.length > 0) {
      clusterComments.articles.push({
        title: article.title,
        source: article.source,
        commentCount: articleComments.comments.length,
        comments: articleComments.comments
      });
      
      clusterComments.topComments.push(...articleComments.comments);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Sort and deduplicate top comments
  clusterComments.topComments = clusterComments.topComments
    .sort((a, b) => b.usefulnessScore - a.usefulnessScore)
    .slice(0, limit);
  
  return clusterComments;
}

// ============================================
// Exports
// ============================================

export {
  fetchRedditComments,
  fetchNewsComments,
  searchHackerNews,
  getCommentsForArticle,
  getCommentsForCluster,
  searchRedditForArticle
};
