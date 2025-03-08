# Instagram AI Automation Tool

A comprehensive autonomous Instagram management system using AI to handle content creation, scheduling, engagement, and analytics.

## Features

- **AI-Powered Content Generation**: Create posts, stories, and reels using GPT-4 and DALL-E
- **Automated Engagement**: Like, comment, and follow based on AI-optimized strategies
- **Analytics Dashboard**: Track performance metrics and get AI-generated insights
- **Competitor Analysis**: Monitor and learn from competitor accounts
- **Smart Scheduling**: Optimize posting times using AI-determined best times
- **Browser Automation**: Seamless interaction with Instagram through headless browsers
- **Proxy Management**: Rotate proxies to prevent IP blocking
- **Rate Limiting**: Smart rate limiting to avoid detection

## Tech Stack

- **Backend**: Node.js with TypeScript
- **AI**: OpenAI GPT-4, Anthropic Claude, TensorFlow.js
- **Web Automation**: Playwright
- **Database**: MongoDB
- **Caching**: Redis
- **Search**: BraveSearch API for trend discovery
- **DevOps**: Docker, GitHub Actions

## Architecture

The system is built with a modular architecture:

- **Core**: Main application and scheduler
- **API**: External API clients (OpenAI, Anthropic, BraveSearch)
- **Automation**: Browser automation for Instagram
- **AI**: AI components for decision making and content generation
- **Database**: Data storage and retrieval
- **Services**: Business logic services
- **Utils**: Utility functions

## Prerequisites

- Node.js 18+
- MongoDB
- Docker (optional)
- API keys for:
  - OpenAI
  - Anthropic Claude
  - BraveSearch
- Instagram account credentials

## Installation

### Manual Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/instagram-ai-bot.git
   cd instagram-ai-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the application:
   ```bash
   npm start
   ```

### Docker Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/instagram-ai-bot.git
   cd instagram-ai-bot
   ```

2. Create .env file:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. Build and run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Configuration

Configure the system through the `.env` file:

```env
# Instagram Credentials
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/instagram-ai-bot
REDIS_URI=redis://localhost:6379

# API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key

# Browser Automation
BROWSER_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
BROWSER_TIMEZONE_ID=America/New_York

# Proxy Configuration (Optional)
USE_PROXIES=false
PROXY_API_KEY=your_proxy_api_key

# Rate Limiting
RATE_LIMIT_INSTAGRAM_MAX_REQUESTS=100
RATE_LIMIT_INSTAGRAM_TIME_WINDOW=3600
```

## Usage

### Command Line Interface

Start the main application:

```bash
npm start
```

Run specific tasks:

```bash
# Generate and post content
npm run task:post-content

# Analyze competitors
npm run task:analyze-competitors

# Engage with users
npm run task:engage-users
```

### API (Future Development)

The system will include a RESTful API:

```bash
# Start API server
npm run api
```

## Safety and Compliance

⚠️ **IMPORTANT**: This tool is designed for legitimate Instagram account management and marketing. Users are responsible for complying with:

- Instagram's Terms of Service
- Content policies
- Rate limits
- Privacy regulations

Misuse of this tool may result in account restrictions or bans.

## Development

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep="Analytics"
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by Instagram or any of its affiliates or subsidiaries. This is an independent and unofficial project. Use at your own risk.