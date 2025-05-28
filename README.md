# Server Time Display

A modern web application that displays accurate server time and monitors server health. Built with SvelteKit and optimized for Netlify deployment.

## Features

- ⏰ **Server-side time generation** - No reliance on client-side time
- 🔄 **Real-time updates** - Time updates every second from the server
- 🏥 **Health monitoring** - Server health checks every 30 seconds
- 📱 **Responsive design** - Works on all devices
- 🚀 **Netlify ready** - Optimized for serverless deployment

## API Endpoints

### GET /api/time
Returns the current server time with timezone information.

```json
{
  "time": "2025-05-28T06:32:29.466Z",
  "timestamp": 1748413949466,
  "timezone": "Asia/Jakarta",
  "status": "healthy"
}
```

### GET /api/health
Returns server health status and performance metrics.

```json
{
  "status": "healthy",
  "timestamp": "2025-05-28T06:32:40.310Z",
  "checks": {
    "server": "healthy",
    "database": "not_applicable",
    "memory": "healthy",
    "uptime": 53.620327268,
    "responseTime": 0
  },
  "version": "1.0.0"
}
```

## Development

### Prerequisites
- Node.js 18+
- Yarn package manager

### Setup
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Deployment to Netlify

### Option 1: Git-based Deployment (Recommended)
1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Netlify
3. Netlify will automatically use the settings from `netlify.toml`:
   - Build command: `yarn build`
   - Publish directory: `build`
   - Node version: 18

### Option 2: Manual Deployment
```bash
# Build the project
yarn build

# Deploy the 'build' folder to Netlify
```

### Configuration
The project includes a `netlify.toml` file with the following configuration:
```toml
[build]
  command = "yarn build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"
```

## Technology Stack

- **Frontend**: SvelteKit 5, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: SvelteKit API routes (serverless functions)
- **Adapter**: @sveltejs/adapter-netlify
- **Deployment**: Netlify

## Project Structure

```
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main time display page
│   │   ├── +layout.svelte        # Layout wrapper
│   │   └── api/
│   │       ├── time/+server.ts   # Time API endpoint
│   │       └── health/+server.ts # Health check endpoint
│   ├── app.html                  # HTML template
│   └── app.css                   # Global styles
├── static/                       # Static assets
├── netlify.toml                  # Netlify configuration
└── package.json                  # Dependencies and scripts
```

## Key Features Details

### Server Time Display
- Fetches time from server every second
- Displays formatted date and time with timezone
- No dependency on client-side clock

### Health Monitoring
- Automatic health checks every 30 seconds
- Manual health check button
- Response time monitoring
- Server status indicators

### Responsive Design
- Mobile-first design approach
- Beautiful gradient backgrounds
- Card-based layout
- Status indicators with color coding

## License

This project is licensed under the MIT License.
