# Hawaiʻi News Aggregator

A Techmeme-style news aggregator for Hawaii news sources, featuring:

- **RSS Feed Aggregation** from 15+ Hawaii news sources
- **Story Clustering** - Groups related articles from different sources
- **Full-Text Search** - Search across all aggregated content
- **Social Media Integration** - Reddit posts and Twitter/X feeds
- **Category Filtering** - Politics, Business, Environment, Community, Emergency
- **Real-time Updates** - Automatic feed refresh every 5 minutes

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Express API    │
│   (Port 3000)   │     │  (Port 3001)    │
└─────────────────┘     └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│  RSS Parser   │    │  Story Clustering │    │ Social Aggregator│
│  (15+ feeds)  │    │  (TF-IDF + NLP)   │    │ (Reddit/Twitter) │
└───────────────┘    └───────────────────┘    └──────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   Data Cache    │
                        │ (Memory + File) │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd hawaii-news

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

**Terminal 1 - Start the API Server:**

```bash
cd server
npm start
```

The API will be available at `http://localhost:3001`

**Terminal 2 - Start the React Client:**

```bash
cd client
npm run dev
```

The client will be available at `http://localhost:3000`

## API Endpoints

### Stories

| Endpoint | Description |
|----------|-------------|
| `GET /api/stories` | Get all clustered stories |
| `GET /api/stories?category=politics` | Filter by category |
| `GET /api/stories/lead` | Get top multi-source stories |
| `GET /api/stories/category/:category` | Get stories by category |

### Search

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=term` | Search stories |
| `GET /api/search/suggest?q=pre` | Search suggestions |

### Articles

| Endpoint | Description |
|----------|-------------|
| `GET /api/articles` | Get raw unclustered articles |
| `GET /api/articles/:id` | Get single article |

### Social

| Endpoint | Description |
|----------|-------------|
| `GET /api/social` | Get social media content |
| `GET /api/social?platform=reddit` | Filter by platform |
| `GET /api/trending` | Get trending topics |

### Meta

| Endpoint | Description |
|----------|-------------|
| `GET /api/sources` | List all news sources |
| `GET /api/categories` | List all categories |
| `GET /api/stats` | Aggregation statistics |
| `GET /api/health` | Health check |
| `POST /api/refresh` | Force feed refresh |

## Configuration

### Environment Variables

**Server (.env)**

```bash
PORT=3001
TWITTER_BEARER_TOKEN=your_twitter_bearer_token  # Optional
```

Twitter integration is optional. Without credentials, the system uses mock Twitter data for development.

### Adding News Sources

Edit `server/sources.js` to add new RSS feeds:

```javascript
{
  id: 'source-id',
  name: 'Full Source Name',
  shortName: 'Short Name',
  url: 'https://source-website.com',
  feedUrls: [
    'https://source-website.com/feed/',
    'https://source-website.com/category/feed/'
  ],
  type: 'daily|digital|broadcast|business|community',
  region: 'statewide|oahu|maui|big-island|kauai',
  priority: 1  // 1=highest, 3=lowest
}
```

## News Sources

Currently aggregating from:

**Major Dailies**
- Honolulu Star-Advertiser
- Maui News
- Hawaii Tribune-Herald
- The Garden Island
- West Hawaii Today

**Digital / Broadcast**
- Civil Beat
- Hawaii News Now
- KHON2
- KITV
- Hawaii Public Radio

**Specialty**
- Pacific Business News
- Ka Wai Ola
- Big Island Now
- Maui Now
- UH News

## Story Clustering Algorithm

The clustering system uses:

1. **TF-IDF Vectorization** - Converts articles to term frequency vectors
2. **Jaccard Similarity** - Measures overlap between article keywords
3. **Named Entity Extraction** - Identifies people, places, organizations
4. **Time Decay** - Reduces similarity for older articles
5. **Source Diversity** - Prevents same-source clustering

Similarity threshold: 0.25 (adjustable in `clustering.js`)

## Search Implementation

- **Inverted Index** - Maps terms to document IDs
- **Porter Stemming** - Normalizes word forms
- **BM25-style Scoring** - Relevance ranking
- **Recency Boost** - Favors recent articles

## Development

### Project Structure

```
hawaii-news/
├── server/
│   ├── index.js          # Express server & routes
│   ├── sources.js        # News source configuration
│   ├── feedParser.js     # RSS feed fetching
│   ├── clustering.js     # Story clustering algorithm
│   ├── socialAggregator.js # Social media integration
│   ├── search.js         # Full-text search
│   └── cache.js          # Data caching layer
│
├── client/
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   └── main.jsx      # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

### Running Tests

```bash
cd server
npm test
```

## Production Deployment

### Docker

```bash
docker-compose up -d
```

### Manual

1. Build the client: `cd client && npm run build`
2. Serve static files from `client/dist`
3. Run server: `cd server && NODE_ENV=production npm start`

### Recommended Infrastructure

- **Server**: 2GB RAM minimum
- **Storage**: 1GB for cache
- **Network**: Outbound access to RSS feeds and Reddit API

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Acknowledgments

- Inspired by [Techmeme](https://techmeme.com)
- Thanks to Hawaii's local news organizations for providing RSS feeds
