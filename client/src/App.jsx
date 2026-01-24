import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

// Custom hook for API fetching
function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Time formatting utilities
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// Story Card Component
function StoryCard({ story, featured = false }) {
  const { lead, related, articleCount, sources } = story;

  return (
    <article className={`story-card ${featured ? 'featured' : ''}`}>
      <div className="story-header">
        <a href={lead.url} target="_blank" rel="noopener noreferrer" className="headline">
          {lead.title}
        </a>
        <div className="story-meta">
          <a href={lead.source.url} target="_blank" rel="noopener noreferrer" className="source">
            {lead.source.shortName}
          </a>
          <span className="time">{formatTimeAgo(lead.publishedAt)}</span>
          {articleCount > 1 && (
            <span className="source-count">{articleCount} sources</span>
          )}
        </div>
      </div>

      {lead.summary && (
        <p className="summary">{lead.summary}</p>
      )}

      {related && related.length > 0 && (
        <div className="related-coverage">
          <span className="related-label">Related:</span>
          <ul className="related-list">
            {related.map((item, idx) => (
              <li key={idx} className="related-item">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="related-link">
                  <span className="related-source">{item.source.shortName}:</span>
                  <span className="related-title">{item.title}</span>
                </a>
                <span className="related-time">{formatTimeAgo(item.publishedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

// Secondary Story Component
function SecondaryStory({ story }) {
  const { lead, related } = story;

  return (
    <article className="secondary-story">
      <a href={lead.url} target="_blank" rel="noopener noreferrer" className="headline">
        {lead.title}
      </a>
      <div className="story-meta">
        <span className="source">{lead.source.shortName}</span>
        <span className="time">{formatTimeAgo(lead.publishedAt)}</span>
      </div>
      {related && related.length > 0 && (
        <div className="related-mini">
          {related.slice(0, 2).map((item, idx) => (
            <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="related-mini-link">
              {item.source.shortName}: {item.title}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

// Social Post Component
function SocialPost({ post }) {
  const isTwitter = post.platform === 'twitter';
  const isReddit = post.platform === 'reddit';

  return (
    <div className="social-post">
      <div className="social-header">
        <span className={`platform-badge ${post.platform}`}>
          {isTwitter ? '𝕏' : 'r/'}
        </span>
        <span className="social-author">{post.author}</span>
        <span className="social-time">{formatTimeAgo(post.createdAt)}</span>
      </div>
      <p className="social-text">
        {isReddit ? post.title : post.text}
      </p>
      <span className="social-engagement">{post.engagement}</span>
    </div>
  );
}

// Category Stories Component
function CategoryStories({ category, stories }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="category-section">
      <h3 className="category-title">{category}</h3>
      {stories.map((story, idx) => (
        <div key={idx} className="category-story">
          <a href={story.lead.url} target="_blank" rel="noopener noreferrer" className="category-headline">
            {story.lead.title}
          </a>
          <div className="category-meta">
            <span className="source">{story.lead.source.shortName}</span>
            <span className="time">{formatTimeAgo(story.lead.publishedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main App Component
function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch data
  const { data: storiesData, loading: storiesLoading, error: storiesError } = 
    useApi(`/stories?category=${activeCategory}&limit=30`);
  const { data: socialData } = useApi('/social?limit=15');
  const { data: sourcesData } = useApi('/sources');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&category=${activeCategory}&limit=20`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Split stories into lead, secondary, and by category
  const stories = searchResults?.results || storiesData?.stories || [];
  const leadStories = stories.filter(s => s.articleCount > 1).slice(0, 4);
  const secondaryStories = stories.slice(0, 10);

  // Group remaining stories by category
  const categorizedStories = stories.reduce((acc, story) => {
    if (!acc[story.category]) acc[story.category] = [];
    if (acc[story.category].length < 5) {
      acc[story.category].push(story);
    }
    return acc;
  }, {});

  const categories = ['all', 'politics', 'business', 'environment', 'community', 'emergency'];

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-left">
            <span className="date">{formatDate(currentTime)}</span>
            <span className="separator">|</span>
            <span className="time">{formatTime(currentTime)}</span>
          </div>
          <div className="header-right">
            <a href="#sources" className="header-link">Sources</a>
            <a href="#about" className="header-link">About</a>
            <a href="/api/articles" className="header-link">API</a>
          </div>
        </div>

        <div className="header-main">
          <h1 className="logo" onClick={clearSearch} style={{ cursor: 'pointer' }}>
            <span className="logo-hawaii">HAWAIʻI</span>
            <span className="logo-news">NEWS</span>
          </h1>
          <p className="tagline">Aggregated news from across the Hawaiian Islands</p>
        </div>

        <nav className="nav">
          {categories.map(cat => (
            <button
              key={cat}
              className={`nav-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                clearSearch();
              }}
            >
              {cat === 'all' ? 'All Stories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <form onSubmit={handleSearch} className="search-box">
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={clearSearch}>×</button>
            )}
          </form>
        </nav>
      </header>

      <main className="main">
        {storiesLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading stories...</p>
          </div>
        )}

        {storiesError && (
          <div className="error">
            <p>Error loading stories: {storiesError}</p>
            <p>Make sure the API server is running on port 3001.</p>
          </div>
        )}

        {searchResults && (
          <div className="search-header">
            <h2>Search results for "{searchResults.query}"</h2>
            <p>{searchResults.results.length} results found</p>
            <button onClick={clearSearch} className="clear-search-btn">Clear search</button>
          </div>
        )}

        {!storiesLoading && !storiesError && (
          <div className="content-grid">
            {/* Lead Stories Column */}
            <section className="lead-stories">
              <h2 className="section-title">
                {searchResults ? 'Search Results' : 'Top Stories'}
              </h2>

              {(searchResults ? stories : leadStories).length === 0 && (
                <p className="no-results">No stories found.</p>
              )}

              {(searchResults ? stories.slice(0, 6) : leadStories).map((story, index) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  featured={index === 0 && !searchResults}
                />
              ))}
            </section>

            {/* Secondary Stories Column */}
            <section className="secondary-stories">
              <h2 className="section-title">More Headlines</h2>

              {secondaryStories.map((story) => (
                <SecondaryStory key={story.id} story={story} />
              ))}

              {!searchResults && Object.entries(categorizedStories)
                .filter(([cat]) => cat !== 'general')
                .map(([category, catStories]) => (
                  <CategoryStories
                    key={category}
                    category={category.charAt(0).toUpperCase() + category.slice(1)}
                    stories={catStories}
                  />
                ))}
            </section>

            {/* Social Sidebar */}
            <aside className="social-sidebar">
              <h2 className="section-title">Social</h2>

              <div className="social-feed">
                {socialData?.twitter?.slice(0, 6).map((post, idx) => (
                  <SocialPost key={`tw-${idx}`} post={post} />
                ))}
                {socialData?.reddit?.slice(0, 4).map((post, idx) => (
                  <SocialPost key={`rd-${idx}`} post={post} />
                ))}
              </div>

              {sourcesData?.sources && (
                <div className="sources-list" id="sources">
                  <h3 className="sources-title">Sources</h3>
                  <ul>
                    {sourcesData.sources.map((source, idx) => (
                      <li key={idx} className="source-item">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                          {source.shortName}
                        </a>
                        <span className="source-type">{source.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section" id="about">
            <h4>About</h4>
            <p>
              Hawaiʻi News aggregates stories from news outlets and social media 
              across the Hawaiian Islands, presenting a comprehensive view of 
              what's happening in our communities. Stories are automatically 
              clustered by topic to show coverage from multiple sources.
            </p>
          </div>
          <div className="footer-section">
            <h4>API</h4>
            <p>Access our data programmatically:</p>
            <code>/api/stories</code><br />
            <code>/api/search?q=term</code><br />
            <code>/api/social</code>
          </div>
          <div className="footer-section">
            <h4>Subscribe</h4>
            <p>Daily digest delivered to your inbox</p>
            <div className="subscribe-form">
              <input type="email" placeholder="your@email.com" />
              <button>Subscribe</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Hawaiʻi News Aggregator. Content belongs to respective publishers.</p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Source+Sans+3:wght@400;500;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --color-bg: #faf9f7;
          --color-paper: #ffffff;
          --color-ink: #1a1a1a;
          --color-ink-light: #4a4a4a;
          --color-ink-muted: #6b6b6b;
          --color-accent: #8b0000;
          --color-accent-light: #c41e3a;
          --color-border: #e0ded9;
          --color-border-dark: #c5c3be;
          --color-highlight: #fff8e7;
          --font-serif: 'Newsreader', Georgia, serif;
          --font-sans: 'Source Sans 3', -apple-system, sans-serif;
        }

        body {
          font-family: var(--font-sans);
          background: var(--color-bg);
          color: var(--color-ink);
          line-height: 1.5;
          font-size: 15px;
        }

        .app {
          min-height: 100vh;
        }

        /* Loading and Error states */
        .loading, .error {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error {
          color: var(--color-accent);
        }

        .no-results {
          color: var(--color-ink-muted);
          padding: 20px;
          text-align: center;
        }

        /* Search header */
        .search-header {
          background: var(--color-highlight);
          padding: 16px 24px;
          margin-bottom: 24px;
          border-bottom: 2px solid var(--color-accent);
        }

        .search-header h2 {
          font-family: var(--font-serif);
          font-size: 18px;
          margin-bottom: 4px;
        }

        .search-header p {
          color: var(--color-ink-muted);
          font-size: 13px;
        }

        .clear-search-btn {
          margin-top: 8px;
          padding: 6px 12px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }

        /* Header */
        .header {
          background: var(--color-paper);
          border-bottom: 3px double var(--color-border-dark);
          padding: 0 24px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
          font-size: 12px;
          color: var(--color-ink-muted);
        }

        .header-left {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .separator {
          color: var(--color-border-dark);
        }

        .header-right {
          display: flex;
          gap: 16px;
        }

        .header-link {
          color: var(--color-ink-muted);
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 11px;
        }

        .header-link:hover {
          color: var(--color-accent);
        }

        .header-main {
          text-align: center;
          padding: 24px 0 16px;
        }

        .logo {
          font-family: var(--font-serif);
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -1px;
          line-height: 1;
        }

        .logo-hawaii {
          color: var(--color-ink);
        }

        .logo-news {
          color: var(--color-accent);
          margin-left: 8px;
        }

        .tagline {
          font-size: 13px;
          color: var(--color-ink-muted);
          margin-top: 8px;
          font-style: italic;
          font-family: var(--font-serif);
        }

        /* Navigation */
        .nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          padding: 12px 0;
          flex-wrap: wrap;
        }

        .nav-btn {
          background: transparent;
          border: none;
          padding: 8px 16px;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          color: var(--color-ink-light);
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          color: var(--color-accent);
        }

        .nav-btn.active {
          color: var(--color-accent);
          border-bottom: 2px solid var(--color-accent);
        }

        .search-box {
          margin-left: 24px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-box input {
          padding: 6px 28px 6px 12px;
          border: 1px solid var(--color-border);
          border-radius: 3px;
          font-size: 13px;
          width: 200px;
          font-family: var(--font-sans);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .search-clear {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          color: var(--color-ink-muted);
          cursor: pointer;
          line-height: 1;
        }

        /* Main Content */
        .main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 320px 280px;
          gap: 32px;
        }

        .section-title {
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--color-ink-muted);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 16px;
        }

        /* Story Cards */
        .lead-stories {
          background: var(--color-paper);
          padding: 20px;
          border: 1px solid var(--color-border);
        }

        .story-card {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--color-border);
        }

        .story-card:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .story-card.featured {
          background: var(--color-highlight);
          margin: -20px -20px 20px -20px;
          padding: 20px;
          border-bottom: 2px solid var(--color-accent);
        }

        .story-card .headline {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 700;
          line-height: 1.3;
          color: var(--color-ink);
          text-decoration: none;
          display: block;
        }

        .story-card.featured .headline {
          font-size: 26px;
        }

        .story-card .headline:hover {
          color: var(--color-accent);
        }

        .story-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 6px;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .story-meta .source {
          color: var(--color-accent);
          text-decoration: none;
          font-weight: 500;
        }

        .story-meta .source:hover {
          text-decoration: underline;
        }

        .story-meta .time {
          color: var(--color-ink-muted);
        }

        .source-count {
          background: var(--color-border);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          color: var(--color-ink-light);
        }

        .summary {
          margin-top: 10px;
          color: var(--color-ink-light);
          font-size: 14px;
          line-height: 1.6;
        }

        /* Related Coverage */
        .related-coverage {
          margin-top: 14px;
          padding-left: 12px;
          border-left: 2px solid var(--color-border);
        }

        .related-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-ink-muted);
          letter-spacing: 0.5px;
        }

        .related-list {
          list-style: none;
          margin-top: 6px;
        }

        .related-item {
          margin-bottom: 6px;
          font-size: 13px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }

        .related-link {
          text-decoration: none;
          color: var(--color-ink-light);
        }

        .related-link:hover {
          color: var(--color-accent);
        }

        .related-source {
          color: var(--color-accent);
          font-weight: 500;
          font-size: 12px;
        }

        .related-time {
          color: var(--color-ink-muted);
          font-size: 11px;
        }

        /* Secondary Stories */
        .secondary-stories {
          background: var(--color-paper);
          padding: 20px;
          border: 1px solid var(--color-border);
        }

        .secondary-story {
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--color-border);
        }

        .secondary-story .headline {
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.4;
          color: var(--color-ink);
          text-decoration: none;
          display: block;
        }

        .secondary-story .headline:hover {
          color: var(--color-accent);
        }

        .secondary-story .story-meta {
          margin-top: 4px;
        }

        .related-mini {
          margin-top: 6px;
          padding-left: 10px;
          border-left: 2px solid var(--color-border);
        }

        .related-mini-link {
          display: block;
          font-size: 12px;
          color: var(--color-ink-muted);
          text-decoration: none;
          line-height: 1.4;
        }

        .related-mini-link:hover {
          color: var(--color-accent);
        }

        /* Category Sections */
        .category-section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 2px solid var(--color-border);
        }

        .category-title {
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-accent);
          margin-bottom: 12px;
        }

        .category-story {
          margin-bottom: 10px;
        }

        .category-headline {
          font-family: var(--font-serif);
          font-size: 14px;
          font-weight: 500;
          color: var(--color-ink);
          text-decoration: none;
          line-height: 1.4;
        }

        .category-headline:hover {
          color: var(--color-accent);
        }

        .category-meta {
          font-size: 11px;
          margin-top: 2px;
        }

        .category-meta .source {
          color: var(--color-ink-muted);
        }

        .category-meta .time {
          color: var(--color-ink-muted);
          margin-left: 6px;
        }

        /* Social Sidebar */
        .social-sidebar {
          background: var(--color-paper);
          padding: 20px;
          border: 1px solid var(--color-border);
        }

        .social-feed {
          margin-bottom: 24px;
        }

        .social-post {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-border);
        }

        .social-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .platform-badge {
          font-weight: 700;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 2px;
        }

        .platform-badge.twitter {
          background: #000;
          color: #fff;
        }

        .platform-badge.reddit {
          background: #ff4500;
          color: #fff;
        }

        .social-author {
          font-weight: 600;
          color: var(--color-ink);
        }

        .social-time {
          color: var(--color-ink-muted);
          margin-left: auto;
          font-size: 11px;
        }

        .social-text {
          font-size: 13px;
          color: var(--color-ink-light);
          line-height: 1.4;
        }

        .social-engagement {
          display: block;
          font-size: 11px;
          color: var(--color-ink-muted);
          margin-top: 4px;
        }

        /* Sources List */
        .sources-list {
          border-top: 2px solid var(--color-border);
          padding-top: 16px;
        }

        .sources-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-ink-muted);
          margin-bottom: 10px;
        }

        .sources-list ul {
          list-style: none;
        }

        .source-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 12px;
        }

        .source-link {
          color: var(--color-ink-light);
          text-decoration: none;
        }

        .source-link:hover {
          color: var(--color-accent);
        }

        .source-type {
          font-size: 10px;
          color: var(--color-ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Footer */
        .footer {
          background: var(--color-ink);
          color: #ccc;
          margin-top: 48px;
          padding: 40px 24px 24px;
        }

        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 40px;
        }

        .footer-section h4 {
          color: #fff;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .footer-section p {
          font-size: 13px;
          line-height: 1.6;
        }

        .footer-section code {
          display: block;
          background: #333;
          padding: 4px 8px;
          margin: 4px 0;
          font-size: 12px;
          border-radius: 3px;
        }

        .subscribe-form {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .subscribe-form input {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 3px;
          font-size: 13px;
        }

        .subscribe-form button {
          padding: 8px 16px;
          background: var(--color-accent);
          color: #fff;
          border: none;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
        }

        .subscribe-form button:hover {
          background: var(--color-accent-light);
        }

        .footer-bottom {
          max-width: 1400px;
          margin: 32px auto 0;
          padding-top: 24px;
          border-top: 1px solid #333;
          text-align: center;
          font-size: 12px;
          color: #888;
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .content-grid {
            grid-template-columns: 1fr 280px;
          }
          .social-sidebar {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .social-sidebar .section-title {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .social-sidebar {
            grid-template-columns: 1fr;
          }
          .footer-content {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .logo {
            font-size: 36px;
          }
          .nav {
            gap: 2px;
          }
          .nav-btn {
            padding: 6px 10px;
            font-size: 11px;
          }
          .search-box {
            margin-left: 0;
            margin-top: 8px;
            width: 100%;
          }
          .search-box input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
