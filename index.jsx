import React, { useState, useEffect } from 'react';

// Mock data - in production, this would come from RSS feeds, APIs, and social media
const mockNewsData = {
  leadStories: [
    {
      id: 1,
      headline: "Hawaiian Electric Proposes $1.2B Grid Modernization Plan",
      source: "Honolulu Star-Advertiser",
      sourceUrl: "https://staradvertiser.com",
      url: "#",
      time: "2h ago",
      summary: "The utility's latest filing outlines infrastructure investments aimed at achieving 100% renewable energy by 2045, including battery storage and distributed generation.",
      image: null,
      relatedCoverage: [
        { source: "Hawaii News Now", title: "HECO plan draws mixed reactions from consumer advocates", url: "#", time: "1h ago" },
        { source: "Civil Beat", title: "Analysis: What the grid plan means for your electric bill", url: "#", time: "45m ago" },
        { source: "Pacific Business News", title: "Investors react to Hawaiian Electric's capital spending proposal", url: "#", time: "30m ago" }
      ],
      discussion: [
        { platform: "twitter", author: "@HawaiiEnergy", text: "Thread: Breaking down the key components of HECO's modernization proposal...", engagement: "234 replies" },
        { platform: "reddit", author: "r/Hawaii", text: "Discussion: Grid modernization plan megathread", engagement: "156 comments" }
      ]
    },
    {
      id: 2,
      headline: "Legislature Advances Crown Lands Bill Requiring OHA Approval for Military Use",
      source: "Civil Beat",
      sourceUrl: "https://civilbeat.org",
      url: "#",
      time: "4h ago",
      summary: "HB 1247 would mandate legislative and Office of Hawaiian Affairs approval before any disposition of former Crown and Government lands for military purposes.",
      relatedCoverage: [
        { source: "Honolulu Star-Advertiser", title: "Military officials express concerns over land bill implications", url: "#", time: "3h ago" },
        { source: "Hawaii Tribune-Herald", title: "Big Island delegation split on Crown lands legislation", url: "#", time: "2h ago" },
        { source: "Ka Wai Ola", title: "OHA trustees support enhanced oversight of ceded lands", url: "#", time: "1h ago" }
      ],
      discussion: [
        { platform: "twitter", author: "@OlopalaNation", text: "This is exactly the kind of protection our ʻāina needs. Full support for HB 1247.", engagement: "89 replies" }
      ]
    },
    {
      id: 3,
      headline: "Maui Wildfire Recovery: FEMA Extends Temporary Housing Deadline",
      source: "Maui News",
      sourceUrl: "https://mauinews.com",
      url: "#",
      time: "5h ago",
      summary: "Federal officials announce six-month extension for temporary housing assistance, responding to slower-than-expected permanent housing construction.",
      relatedCoverage: [
        { source: "Hawaii News Now", title: "Lahaina residents react to FEMA extension announcement", url: "#", time: "4h ago" },
        { source: "Associated Press", title: "Maui recovery faces ongoing housing shortage 18 months after fires", url: "#", time: "3h ago" },
        { source: "Civil Beat", title: "Inside the bureaucratic challenges slowing Lahaina rebuilding", url: "#", time: "2h ago" }
      ],
      discussion: []
    }
  ],
  secondaryStories: [
    {
      id: 4,
      headline: "Honolulu Rail: Final Segment Receives Federal Approval",
      source: "Hawaii News Now",
      url: "#",
      time: "6h ago",
      relatedCoverage: [
        { source: "Star-Advertiser", title: "Rail construction timeline updated for Ala Moana extension", url: "#" }
      ]
    },
    {
      id: 5,
      headline: "Tourism Numbers Remain Flat as Japan Market Recovers",
      source: "Pacific Business News",
      url: "#",
      time: "7h ago",
      relatedCoverage: [
        { source: "Travel Weekly", title: "Hawaii hotels report mixed occupancy rates", url: "#" }
      ]
    },
    {
      id: 6,
      headline: "UH Researchers Discover New Deep-Sea Species Off Kona Coast",
      source: "University of Hawaii News",
      url: "#",
      time: "8h ago",
      relatedCoverage: []
    },
    {
      id: 7,
      headline: "Kauai County Council Debates Progressive Property Tax Proposal",
      source: "The Garden Island",
      url: "#",
      time: "9h ago",
      relatedCoverage: [
        { source: "Civil Beat", title: "Analysis: How acreage-based surtaxes could affect landowners", url: "#" }
      ]
    },
    {
      id: 8,
      headline: "State Teachers Union Presents Salary Study Comparing Hawaii to West Coast",
      source: "Honolulu Star-Advertiser",
      url: "#",
      time: "10h ago",
      relatedCoverage: []
    }
  ],
  categories: {
    politics: [
      { headline: "Governor Signs Executive Order on Food Security", source: "Civil Beat", time: "3h ago", url: "#" },
      { headline: "City Council Approves Affordable Housing Fast-Track", source: "Star-Advertiser", time: "5h ago", url: "#" },
      { headline: "Senate Committee Advances Water Rights Legislation", source: "Hawaii News Now", time: "8h ago", url: "#" }
    ],
    business: [
      { headline: "Hawaiian Airlines Reports Q4 Earnings Above Expectations", source: "Pacific Business News", time: "4h ago", url: "#" },
      { headline: "Local Tech Startup Raises $15M for Agricultural AI", source: "TechHui", time: "6h ago", url: "#" },
      { headline: "Port of Honolulu Expansion Project Breaks Ground", source: "Star-Advertiser", time: "12h ago", url: "#" }
    ],
    environment: [
      { headline: "Coral Reef Restoration Project Shows Promising Results", source: "Hawaii News Now", time: "5h ago", url: "#" },
      { headline: "Invasive Species Alert Issued for Oahu Watershed", source: "DLNR", time: "7h ago", url: "#" },
      { headline: "Climate Report: Sea Level Rise Projections Updated", source: "UH News", time: "1d ago", url: "#" }
    ],
    community: [
      { headline: "Merrie Monarch Festival Announces 2026 Dates", source: "Hawaii Tribune-Herald", time: "6h ago", url: "#" },
      { headline: "Kalihi Valley Community Center Expansion Approved", source: "Midweek", time: "1d ago", url: "#" },
      { headline: "Public Schools Report Improved Attendance Rates", source: "Star-Advertiser", time: "1d ago", url: "#" }
    ]
  },
  social: [
    { platform: "twitter", author: "@CivilBeat", handle: "@CivilBeat", text: "BREAKING: Senate Ways and Means advances ceded lands revenue bill with amendments. Full coverage coming.", time: "15m ago", engagement: "45 retweets" },
    { platform: "twitter", author: "@GovJoshGreen", handle: "@GovJoshGreen", text: "Proud to announce $50M in federal grants secured for Maui recovery housing. Mahalo to our Congressional delegation.", time: "1h ago", engagement: "234 retweets" },
    { platform: "twitter", author: "@HINatureCenter", handle: "@HINatureCenter", text: "Whale season update: Record number of humpback sightings this week off Maui coast! 🐋", time: "2h ago", engagement: "189 retweets" },
    { platform: "twitter", author: "@HPaborWatch", handle: "@HawaiiLabor", text: "Teachers rally at Capitol today demanding cost-of-living adjustments. Coverage at noon.", time: "3h ago", engagement: "67 retweets" },
    { platform: "reddit", author: "r/Hawaii", handle: "u/localresident808", text: "Anyone else notice the new bus routes in Kalihi? Finally some improvements.", time: "4h ago", engagement: "89 comments" },
    { platform: "twitter", author: "@ABORECIPES", handle: "@ABORecipes", text: "New poi supplier alert: Check out the fresh batch from Waipio Valley at Saturday's farmers market.", time: "5h ago", engagement: "56 retweets" }
  ]
};

const sources = [
  { name: "Honolulu Star-Advertiser", url: "https://staradvertiser.com", type: "daily" },
  { name: "Civil Beat", url: "https://civilbeat.org", type: "digital" },
  { name: "Hawaii News Now", url: "https://hawaiinewsnow.com", type: "broadcast" },
  { name: "Maui News", url: "https://mauinews.com", type: "daily" },
  { name: "Hawaii Tribune-Herald", url: "https://hawaiitribune-herald.com", type: "daily" },
  { name: "The Garden Island", url: "https://thegardenisland.com", type: "daily" },
  { name: "Pacific Business News", url: "https://bizjournals.com/pacific", type: "business" },
  { name: "Ka Wai Ola", url: "https://kawaiola.news", type: "community" },
  { name: "Ke Ola Magazine", url: "https://keolamagazine.com", type: "magazine" },
  { name: "Midweek", url: "https://midweek.com", type: "weekly" }
];

function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

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
            <a href="#rss" className="header-link">RSS</a>
          </div>
        </div>
        
        <div className="header-main">
          <h1 className="logo">
            <span className="logo-hawaii">HAWAIʻI</span>
            <span className="logo-news">NEWS</span>
          </h1>
          <p className="tagline">Aggregated news from across the Hawaiian Islands</p>
        </div>

        <nav className="nav">
          <button 
            className={`nav-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Stories
          </button>
          <button 
            className={`nav-btn ${activeCategory === 'politics' ? 'active' : ''}`}
            onClick={() => setActiveCategory('politics')}
          >
            Politics
          </button>
          <button 
            className={`nav-btn ${activeCategory === 'business' ? 'active' : ''}`}
            onClick={() => setActiveCategory('business')}
          >
            Business
          </button>
          <button 
            className={`nav-btn ${activeCategory === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveCategory('environment')}
          >
            Environment
          </button>
          <button 
            className={`nav-btn ${activeCategory === 'community' ? 'active' : ''}`}
            onClick={() => setActiveCategory('community')}
          >
            Community
          </button>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </nav>
      </header>

      <main className="main">
        <div className="content-grid">
          {/* Lead Stories Column */}
          <section className="lead-stories">
            <h2 className="section-title">Top Stories</h2>
            
            {mockNewsData.leadStories.map((story, index) => (
              <article key={story.id} className={`lead-story ${index === 0 ? 'featured' : ''}`}>
                <div className="story-header">
                  <a href={story.url} className="headline">{story.headline}</a>
                  <div className="story-meta">
                    <a href={story.sourceUrl} className="source">{story.source}</a>
                    <span className="time">{story.time}</span>
                  </div>
                </div>
                
                {story.summary && (
                  <p className="summary">{story.summary}</p>
                )}

                {story.relatedCoverage.length > 0 && (
                  <div className="related-coverage">
                    <span className="related-label">Related:</span>
                    <ul className="related-list">
                      {story.relatedCoverage.map((related, idx) => (
                        <li key={idx} className="related-item">
                          <a href={related.url} className="related-link">
                            <span className="related-source">{related.source}:</span>
                            <span className="related-title">{related.title}</span>
                          </a>
                          {related.time && <span className="related-time">{related.time}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {story.discussion && story.discussion.length > 0 && (
                  <div className="discussion">
                    <span className="discussion-label">Discussion:</span>
                    {story.discussion.map((item, idx) => (
                      <div key={idx} className="discussion-item">
                        <span className={`platform-icon ${item.platform}`}>
                          {item.platform === 'twitter' ? '𝕏' : item.platform === 'reddit' ? 'r/' : '💬'}
                        </span>
                        <span className="discussion-author">{item.author}</span>
                        <span className="discussion-text">{item.text}</span>
                        <span className="discussion-engagement">{item.engagement}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>

          {/* Secondary Stories Column */}
          <section className="secondary-stories">
            <h2 className="section-title">More Headlines</h2>
            
            {mockNewsData.secondaryStories.map((story) => (
              <article key={story.id} className="secondary-story">
                <a href={story.url} className="headline">{story.headline}</a>
                <div className="story-meta">
                  <span className="source">{story.source}</span>
                  <span className="time">{story.time}</span>
                </div>
                {story.relatedCoverage.length > 0 && (
                  <div className="related-mini">
                    {story.relatedCoverage.map((related, idx) => (
                      <a key={idx} href={related.url} className="related-mini-link">
                        {related.source}: {related.title}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {/* Category Sections */}
            {Object.entries(mockNewsData.categories).map(([category, stories]) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                {stories.map((story, idx) => (
                  <div key={idx} className="category-story">
                    <a href={story.url} className="category-headline">{story.headline}</a>
                    <div className="category-meta">
                      <span className="source">{story.source}</span>
                      <span className="time">{story.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {/* Social Sidebar */}
          <aside className="social-sidebar">
            <h2 className="section-title">Social</h2>
            
            <div className="social-feed">
              {mockNewsData.social.map((post, idx) => (
                <div key={idx} className="social-post">
                  <div className="social-header">
                    <span className={`platform-badge ${post.platform}`}>
                      {post.platform === 'twitter' ? '𝕏' : 'r/'}
                    </span>
                    <span className="social-author">{post.author}</span>
                    <span className="social-time">{post.time}</span>
                  </div>
                  <p className="social-text">{post.text}</p>
                  <span className="social-engagement">{post.engagement}</span>
                </div>
              ))}
            </div>

            <div className="sources-list">
              <h3 className="sources-title">Sources</h3>
              <ul>
                {sources.map((source, idx) => (
                  <li key={idx} className="source-item">
                    <a href={source.url} className="source-link">{source.name}</a>
                    <span className="source-type">{source.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>About</h4>
            <p>Hawaiʻi News aggregates stories from news outlets and social media across the Hawaiian Islands, presenting a comprehensive view of what's happening in our communities.</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>feedback@example.com</p>
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
          --color-social-twitter: #1da1f2;
          --color-social-reddit: #ff4500;
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
        }

        .search-box input {
          padding: 6px 12px;
          border: 1px solid var(--color-border);
          border-radius: 3px;
          font-size: 13px;
          width: 180px;
          font-family: var(--font-sans);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--color-accent);
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

        /* Lead Stories */
        .lead-stories {
          background: var(--color-paper);
          padding: 20px;
          border: 1px solid var(--color-border);
        }

        .lead-story {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--color-border);
        }

        .lead-story:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .lead-story.featured {
          background: var(--color-highlight);
          margin: -20px -20px 20px -20px;
          padding: 20px;
          border-bottom: 2px solid var(--color-accent);
        }

        .lead-story .headline {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 700;
          line-height: 1.3;
          color: var(--color-ink);
          text-decoration: none;
          display: block;
        }

        .lead-story.featured .headline {
          font-size: 26px;
        }

        .lead-story .headline:hover {
          color: var(--color-accent);
        }

        .story-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 6px;
          font-size: 12px;
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

        .related-title {
          color: var(--color-ink-light);
        }

        .related-time {
          color: var(--color-ink-muted);
          font-size: 11px;
        }

        /* Discussion */
        .discussion {
          margin-top: 12px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .discussion-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-ink-muted);
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
        }

        .discussion-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 12px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .platform-icon {
          font-weight: 700;
          font-size: 11px;
        }

        .platform-icon.twitter {
          color: #000;
        }

        .platform-icon.reddit {
          color: var(--color-social-reddit);
        }

        .discussion-author {
          font-weight: 600;
          color: var(--color-ink-light);
        }

        .discussion-text {
          color: var(--color-ink-muted);
          flex: 1;
          min-width: 200px;
        }

        .discussion-engagement {
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
          background: var(--color-social-reddit);
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
