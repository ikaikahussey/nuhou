// Hawaii news sources with RSS feeds and metadata
export const sources = [
  {
    id: 'star-advertiser',
    name: 'Honolulu Star-Advertiser',
    shortName: 'Star-Advertiser',
    url: 'https://www.staradvertiser.com',
    feedUrls: [
      'https://www.staradvertiser.com/feed/',
      'https://www.staradvertiser.com/category/breaking-news/feed/',
      'https://www.staradvertiser.com/category/hawaii-news/feed/'
    ],
    type: 'daily',
    region: 'statewide',
    priority: 1
  },
  {
    id: 'civil-beat',
    name: 'Honolulu Civil Beat',
    shortName: 'Civil Beat',
    url: 'https://www.civilbeat.org',
    feedUrls: [
      'https://www.civilbeat.org/feed/'
    ],
    type: 'digital',
    region: 'statewide',
    priority: 1
  },
  {
    id: 'hawaii-news-now',
    name: 'Hawaii News Now',
    shortName: 'Hawaii News Now',
    url: 'https://www.hawaiinewsnow.com',
    feedUrls: [
      'https://www.hawaiinewsnow.com/search/?f=rss&t=article&c=news&l=50&s=start_time&sd=desc'
    ],
    type: 'broadcast',
    region: 'statewide',
    priority: 1
  },
  {
    id: 'maui-news',
    name: 'The Maui News',
    shortName: 'Maui News',
    url: 'https://www.mauinews.com',
    feedUrls: [
      'https://www.mauinews.com/feed/'
    ],
    type: 'daily',
    region: 'maui',
    priority: 2
  },
  {
    id: 'hawaii-tribune-herald',
    name: 'Hawaii Tribune-Herald',
    shortName: 'Tribune-Herald',
    url: 'https://www.hawaiitribune-herald.com',
    feedUrls: [
      'https://www.hawaiitribune-herald.com/feed/'
    ],
    type: 'daily',
    region: 'big-island',
    priority: 2
  },
  {
    id: 'garden-island',
    name: 'The Garden Island',
    shortName: 'Garden Island',
    url: 'https://www.thegardenisland.com',
    feedUrls: [
      'https://www.thegardenisland.com/feed/'
    ],
    type: 'daily',
    region: 'kauai',
    priority: 2
  },
  {
    id: 'west-hawaii-today',
    name: 'West Hawaii Today',
    shortName: 'West Hawaii Today',
    url: 'https://www.westhawaiitoday.com',
    feedUrls: [
      'https://www.westhawaiitoday.com/feed/'
    ],
    type: 'daily',
    region: 'big-island',
    priority: 2
  },
  {
    id: 'pacific-business-news',
    name: 'Pacific Business News',
    shortName: 'Pacific Business News',
    url: 'https://www.bizjournals.com/pacific',
    feedUrls: [
      'https://www.bizjournals.com/pacific/news/rss.xml'
    ],
    type: 'business',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'khon2',
    name: 'KHON2',
    shortName: 'KHON2',
    url: 'https://www.khon2.com',
    feedUrls: [
      'https://www.khon2.com/feed/'
    ],
    type: 'broadcast',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'kitv',
    name: 'KITV Island News',
    shortName: 'KITV',
    url: 'https://www.kitv.com',
    feedUrls: [
      'https://www.kitv.com/search/?f=rss&t=article&l=50&s=start_time&sd=desc'
    ],
    type: 'broadcast',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'hawaii-public-radio',
    name: 'Hawaii Public Radio',
    shortName: 'HPR',
    url: 'https://www.hawaiipublicradio.org',
    feedUrls: [
      'https://www.hawaiipublicradio.org/feed/'
    ],
    type: 'public',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'ka-wai-ola',
    name: 'Ka Wai Ola',
    shortName: 'Ka Wai Ola',
    url: 'https://kawaiola.news',
    feedUrls: [
      'https://kawaiola.news/feed/'
    ],
    type: 'community',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'big-island-now',
    name: 'Big Island Now',
    shortName: 'Big Island Now',
    url: 'https://bigislandnow.com',
    feedUrls: [
      'https://bigislandnow.com/feed/'
    ],
    type: 'digital',
    region: 'big-island',
    priority: 3
  },
  {
    id: 'maui-now',
    name: 'Maui Now',
    shortName: 'Maui Now',
    url: 'https://mauinow.com',
    feedUrls: [
      'https://mauinow.com/feed/'
    ],
    type: 'digital',
    region: 'maui',
    priority: 3
  },
  {
    id: 'uh-news',
    name: 'University of Hawaii News',
    shortName: 'UH News',
    url: 'https://www.hawaii.edu/news',
    feedUrls: [
      'https://www.hawaii.edu/news/feed/'
    ],
    type: 'institutional',
    region: 'statewide',
    priority: 3
  },
  {
    id: 'reddit-hawaii',
    name: 'Reddit r/Hawaii',
    shortName: 'r/Hawaii',
    url: 'https://www.reddit.com/r/Hawaii',
    feedUrls: [
      'https://www.reddit.com/r/Hawaii/.rss'
    ],
    type: 'social',
    region: 'statewide',
    priority: 2
  },
  {
    id: 'reddit-honolulu',
    name: 'Reddit r/Honolulu',
    shortName: 'r/Honolulu',
    url: 'https://www.reddit.com/r/Honolulu',
    feedUrls: [
      'https://www.reddit.com/r/Honolulu/.rss'
    ],
    type: 'social',
    region: 'oahu',
    priority: 3
  },
  {
    id: 'reddit-maui',
    name: 'Reddit r/Maui',
    shortName: 'r/Maui',
    url: 'https://www.reddit.com/r/maui',
    feedUrls: [
      'https://www.reddit.com/r/maui/.rss'
    ],
    type: 'social',
    region: 'maui',
    priority: 3
  },
  {
    id: 'reddit-bigisland',
    name: 'Reddit r/BigIsland',
    shortName: 'r/BigIsland',
    url: 'https://www.reddit.com/r/BigIsland',
    feedUrls: [
      'https://www.reddit.com/r/BigIsland/.rss'
    ],
    type: 'social',
    region: 'big-island',
    priority: 3
  },
  {
    id: 'reddit-kauai',
    name: 'Reddit r/Kauai',
    shortName: 'r/Kauai',
    url: 'https://www.reddit.com/r/kauai',
    feedUrls: [
      'https://www.reddit.com/r/kauai/.rss'
    ],
    type: 'social',
    region: 'kauai',
    priority: 3
  }
];

// Category classification keywords
export const categoryKeywords = {
  politics: [
    'legislature', 'senator', 'representative', 'governor', 'mayor', 'bill', 'law',
    'election', 'vote', 'campaign', 'democrat', 'republican', 'council', 'committee',
    'testimony', 'hearing', 'oha', 'dhhl', 'sovereignty', 'ceded lands', 'crown lands',
    'federal', 'state', 'county', 'city council', 'house', 'senate', 'capitol'
  ],
  business: [
    'economy', 'business', 'company', 'corporation', 'stock', 'investment', 'revenue',
    'profit', 'loss', 'employment', 'jobs', 'layoff', 'hiring', 'startup', 'entrepreneur',
    'real estate', 'development', 'construction', 'hotel', 'resort', 'retail', 'tourism',
    'airline', 'hawaiian airlines', 'agriculture', 'export', 'import', 'trade'
  ],
  environment: [
    'environment', 'climate', 'ocean', 'coral', 'reef', 'conservation', 'endangered',
    'wildlife', 'species', 'pollution', 'renewable', 'solar', 'wind', 'energy',
    'sustainability', 'watershed', 'forest', 'invasive', 'native', 'ecosystem',
    'sea level', 'carbon', 'emissions', 'volcano', 'lava', 'earthquake', 'tsunami'
  ],
  community: [
    'community', 'neighborhood', 'school', 'education', 'student', 'university',
    'culture', 'festival', 'event', 'celebration', 'arts', 'music', 'hula',
    'merrie monarch', 'aloha', 'ohana', 'keiki', 'kupuna', 'nonprofit', 'volunteer',
    'church', 'temple', 'health', 'hospital', 'medical', 'sports', 'athletics'
  ],
  emergency: [
    'fire', 'wildfire', 'hurricane', 'storm', 'flood', 'emergency', 'evacuation',
    'rescue', 'police', 'crime', 'accident', 'crash', 'traffic', 'road closure',
    'power outage', 'water', 'alert', 'warning', 'missing', 'death', 'fatal'
  ],
  military: [
    'military', 'army', 'navy', 'air force', 'marine', 'coast guard', 'pearl harbor',
    'schofield', 'hickam', 'kaneohe', 'pohakuloa', 'base', 'rimpac', 'veterans',
    'defense', 'pacific command', 'indo-pacific'
  ]
};

export default sources;
