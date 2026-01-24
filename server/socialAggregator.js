import { socialSources } from './sources.js';

// Reddit API client (using public JSON endpoints - no auth needed for read-only)
async function fetchRedditPosts(subreddit, limit = 25) {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: {
          'User-Agent': 'HawaiiNewsAggregator/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    const posts = data.data.children.map(child => child.data);
    
    return posts.map(post => ({
      id: post.id,
      platform: 'reddit',
      subreddit: post.subreddit_name_prefixed,
      author: `u/${post.author}`,
      title: post.title,
      text: post.selftext?.substring(0, 280) || post.title,
      url: `https://reddit.com${post.permalink}`,
      externalUrl: post.url !== `https://reddit.com${post.permalink}` ? post.url : null,
      score: post.score,
      numComments: post.num_comments,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      engagement: `${post.score} points, ${post.num_comments} comments`,
      flair: post.link_flair_text,
      isNews: isNewsRelated(post.title, post.selftext || '')
    }));
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error.message);
    return [];
  }
}

// Check if post is news-related
function isNewsRelated(title, text) {
  const newsKeywords = [
    'breaking', 'news', 'report', 'update', 'announced', 'confirms', 'official',
    'governor', 'mayor', 'police', 'fire', 'emergency', 'election', 'bill',
    'passes', 'court', 'ruling', 'decision', 'investigation', 'arrest'
  ];
  
  const combined = `${title} ${text}`.toLowerCase();
  return newsKeywords.some(keyword => combined.includes(keyword));
}

// Fetch all Reddit posts from Hawaii subreddits
async function fetchAllRedditPosts() {
  const allPosts = [];
  
  for (const subreddit of socialSources.reddit.subreddits) {
    const posts = await fetchRedditPosts(subreddit.name);
    allPosts.push(...posts);
    
    // Rate limiting - be nice to Reddit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Sort by score and recency
  allPosts.sort((a, b) => {
    // Prioritize news-related posts
    if (a.isNews !== b.isNews) return b.isNews ? 1 : -1;
    
    // Then by engagement
    return b.score - a.score;
  });
  
  return allPosts;
}

// Twitter/X API integration
// Note: Requires API credentials in production
// Using mock data structure for development
class TwitterClient {
  constructor(credentials = null) {
    this.credentials = credentials;
    this.isConfigured = !!(credentials?.apiKey && credentials?.apiSecret);
  }
  
  async fetchUserTimeline(username, count = 10) {
    if (!this.isConfigured) {
      return this.getMockTweets(username, count);
    }
    
    // Real Twitter API implementation would go here
    // Using Twitter API v2
    try {
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}/tweets?max_results=${count}&tweet.fields=created_at,public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.bearerToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatTweets(data.data || [], username);
    } catch (error) {
      console.error(`Error fetching @${username}:`, error.message);
      return [];
    }
  }
  
  async searchTweets(query, count = 20) {
    if (!this.isConfigured) {
      return this.getMockSearchResults(query, count);
    }
    
    // Real Twitter search implementation
    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${count}&tweet.fields=created_at,public_metrics,author_id`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.bearerToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatTweets(data.data || [], null);
    } catch (error) {
      console.error(`Error searching Twitter:`, error.message);
      return [];
    }
  }
  
  formatTweets(tweets, username) {
    return tweets.map(tweet => ({
      id: tweet.id,
      platform: 'twitter',
      author: username ? `@${username}` : tweet.author_id,
      text: tweet.text,
      url: `https://twitter.com/${username || 'i'}/status/${tweet.id}`,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      engagement: tweet.public_metrics 
        ? `${tweet.public_metrics.retweet_count} retweets, ${tweet.public_metrics.like_count} likes`
        : null
    }));
  }
  
  // Mock data for development without API credentials
  getMockTweets(username, count) {
    const mockTemplates = {
      'CivilBeat': [
        { text: 'BREAKING: Legislature passes landmark housing bill after marathon session. Full coverage: ', suffix: 'link' },
        { text: 'Our latest investigation reveals gaps in state oversight of...' },
        { text: 'Analysis: What the governor\'s new budget proposal means for education funding' }
      ],
      'StarAdvertiser': [
        { text: 'UPDATE: Traffic advisory for H-1 westbound due to accident near Pearl City' },
        { text: 'Hawaii tourism numbers for December show mixed results' },
        { text: 'BREAKING: Major development proposed for Kakaako waterfront' }
      ],
      'HawaiiNewsNow': [
        { text: '🚨 JUST IN: Brush fire reported in Waianae. Fire crews responding.' },
        { text: 'Weather alert: High surf advisory in effect for north and west shores' },
        { text: 'LIVE: Governor\'s press conference on economic recovery plan' }
      ],
      'GovJoshGreen': [
        { text: 'Proud to announce $200M in federal funding secured for Maui recovery efforts. Mahalo to our federal partners.' },
        { text: 'Met with community leaders today to discuss housing solutions. Together, we can address this crisis.' }
      ],
      'MayorRick': [
        { text: 'Great progress on rail construction! On track for Ala Moana extension timeline.' },
        { text: 'Announced new affordable housing initiative for urban Honolulu today.' }
      ]
    };
    
    const templates = mockTemplates[username] || [
      { text: `Latest update from @${username} on Hawaii news and events.` }
    ];
    
    return templates.slice(0, count).map((template, i) => ({
      id: `mock-${username}-${i}`,
      platform: 'twitter',
      author: `@${username}`,
      text: template.text,
      url: `https://twitter.com/${username}/status/mock${i}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      engagement: `${Math.floor(Math.random() * 200)} retweets, ${Math.floor(Math.random() * 500)} likes`,
      isMock: true
    }));
  }
  
  getMockSearchResults(query, count) {
    return Array(Math.min(count, 5)).fill(null).map((_, i) => ({
      id: `mock-search-${i}`,
      platform: 'twitter',
      author: `@user${i}`,
      text: `Discussion about ${query} - interesting developments happening in Hawaii.`,
      url: `https://twitter.com/user${i}/status/mock${i}`,
      createdAt: new Date(Date.now() - i * 1800000).toISOString(),
      engagement: `${Math.floor(Math.random() * 50)} retweets`,
      isMock: true
    }));
  }
}

// Aggregate all social media content
export async function fetchSocialContent(twitterCredentials = null) {
  const twitter = new TwitterClient(twitterCredentials);
  const results = {
    twitter: [],
    reddit: [],
    fetchedAt: new Date().toISOString()
  };
  
  // Fetch Reddit posts
  console.log('Fetching Reddit posts...');
  results.reddit = await fetchAllRedditPosts();
  
  // Fetch Twitter content from configured accounts
  console.log('Fetching Twitter content...');
  for (const account of socialSources.twitter.accounts) {
    const tweets = await twitter.fetchUserTimeline(account.handle, 5);
    results.twitter.push(...tweets.map(t => ({
      ...t,
      accountType: account.type,
      accountName: account.name
    })));
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Sort Twitter by recency
  results.twitter.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  console.log(`Fetched ${results.twitter.length} tweets, ${results.reddit.length} Reddit posts`);
  return results;
}

// Get trending topics from social content
export function getTrendingTopics(socialContent) {
  const topics = {};
  
  // Extract topics from Twitter
  for (const tweet of socialContent.twitter) {
    const hashtags = tweet.text.match(/#\w+/g) || [];
    for (const tag of hashtags) {
      const normalized = tag.toLowerCase();
      topics[normalized] = (topics[normalized] || 0) + 1;
    }
  }
  
  // Extract from Reddit titles
  for (const post of socialContent.reddit) {
    const words = post.title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 5 && !['about', 'would', 'could', 'should', 'there', 'their', 'which'].includes(word)) {
        topics[word] = (topics[word] || 0) + 1;
      }
    }
  }
  
  // Sort by frequency
  return Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic, count]) => ({ topic, count }));
}

// Filter social content by relevance to news
export function filterNewsRelevant(socialContent) {
  return {
    twitter: socialContent.twitter.filter(t => 
      t.accountType === 'news' || 
      t.accountType === 'government' ||
      t.text.toLowerCase().includes('breaking') ||
      t.text.toLowerCase().includes('update')
    ),
    reddit: socialContent.reddit.filter(p => p.isNews || p.score > 50)
  };
}

export default {
  fetchSocialContent,
  getTrendingTopics,
  filterNewsRelevant,
  fetchRedditPosts,
  TwitterClient
};
