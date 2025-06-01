# Exam Time Display

A modern web application designed for displaying accurate time during exams with comprehensive exam management features. Built with SvelteKit and supports both NTP synchronization and local time fallback. Deployable on Netlify, Docker, or Kubernetes.

## Features

### ⏰ **Advanced Time Management**
- 🌐 **NTP Synchronization** - Syncs with configurable NTP servers (e.g., ntp.ui.ac.id)
- 🔄 **Intelligent Fallback** - Falls back to local time if NTP fails
- 🎯 **Partial NTP Support** - Handles NTP servers that return time without valid metrics
- 🔧 **Force NTP Mode** - Operator control to treat partial NTP sync as full sync
- 📍 **Timezone Support** - Configurable timezone display

### 📋 **Exam Management**
- 📝 **Custom Titles** - Set custom exam titles (e.g., "Final Exam", "Quiz Time")
- ⏱️ **Checkpoint System** - Predefined and custom exam checkpoints with visual indicators
- 📢 **Announcements** - Display exam announcements with flexible positioning
- 🎨 **Visual Checkpoints** - Color-coded checkpoints with emojis and custom styling
- 📅 **Auto-scheduling** - Automatic checkpoint calculation based on exam duration

### 🔧 **Operator Controls**
- 🎛️ **Live Configuration** - Real-time exam settings without page refresh
- 💾 **Persistent Settings** - Settings saved to localStorage
- 🚨 **Status Monitoring** - Real-time time source and sync status display
- 🔄 **Manual Updates** - Force time refresh and NTP retry functionality

### 🏥 **System Monitoring**
- 📊 **Health Checks** - Comprehensive server health monitoring
- 🌡️ **NTP Status** - Detailed NTP sync status with error reporting
- 📈 **Performance Metrics** - Response time and system resource monitoring
- 🔍 **Debug Information** - Detailed logging for troubleshooting

### 🎯 **Production Ready**
- 🐳 **Docker Support** - Multi-stage Docker build with security best practices
- ☸️ **Kubernetes Ready** - Complete K8s manifests with health checks
- 🔒 **Security Hardened** - Non-root containers, minimal privileges
- 📱 **Responsive Design** - Works on all devices and screen sizes

## API Endpoints

### GET /api/time
Returns the current time with NTP synchronization status and detailed metrics.

```json
{
  "time": "2025-06-01T14:32:29.466Z",
  "timestamp": 1748413949466,
  "timezone": "Asia/Jakarta",
  "localTime": "01/06/2025, 21:32:29",
  "timeSource": "ntp",
  "ntp": {
    "server": "ntp.ui.ac.id",
    "offset": 2,
    "delay": 45,
    "hasValidMetrics": true
  },
  "status": "healthy",
  "debug": {
    "ntpServerConfigured": true,
    "ntpServerValue": "ntp.ui.ac.id",
    "serverTimeSource": "Date"
  }
}
```

**Time Source Values:**
- `ntp` - Full NTP synchronization with valid metrics
- `ntp_partial` - NTP time received but offset/delay metrics unavailable
- `local_fallback` - NTP failed, using application server time
- `local` - No NTP server configured, using application server time

### GET /api/health
Returns comprehensive server health status and performance metrics.

```json
{
  "status": "healthy",
  "timestamp": "2025-06-01T14:32:40.310Z",
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

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and customize:

```bash
# Timezone for the exam display (IANA timezone identifiers)
TIMEZONE=Asia/Jakarta

# NTP Server for time synchronization
# Leave empty to use application server time
NTP_SERVER=ntp.ui.ac.id

# Application Port
PORT=3000

# Node Environment
NODE_ENV=production
```

### NTP Configuration
- **Recommended servers**: `ntp.ui.ac.id`, `pool.ntp.org`, `time.google.com`
- **Partial sync handling**: App accepts NTP time even when offset/delay metrics are unavailable
- **Force NTP mode**: Operators can override partial sync status via the UI
- **Automatic fallback**: Falls back to local time if NTP completely fails

## Development

### Prerequisites
- Node.js 18+
- npm or yarn package manager

### Setup
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Features
- 🔥 **Hot reload** - Instant updates during development
- 🎯 **Type checking** - Full TypeScript support with svelte-check
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 📏 **ESLint & Prettier** - Code quality and formatting

## Deployment Options

### 1. Netlify Deployment (Serverless)

#### Git-based Deployment (Recommended)
1. Push your code to GitHub/GitLab
2. Connect repository to Netlify
3. Netlify automatically uses settings from `netlify.toml`

#### Manual Deployment
```bash
npm run build
# Deploy the 'build' folder to Netlify
```

### 2. Docker Deployment

```bash
# Build image
docker build -t exam-display .

# Run container
docker run -p 3000:3000 \
  -e NTP_SERVER=ntp.ui.ac.id \
  -e TIMEZONE=Asia/Jakarta \
  exam-display
```

#### Docker Compose
```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Kubernetes Deployment

```bash
# Deploy all components
kubectl apply -f k8s-all-in-one.yaml

# Or deploy individually
kubectl apply -f k8s-configmap.yaml
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml

# Check status
kubectl get pods -l app=exam-display
kubectl get svc exam-display-service
```

#### Kubernetes Features
- **High Availability**: 2 replicas with load balancing
- **Health Checks**: Liveness and readiness probes
- **Security**: Non-root containers with minimal privileges
- **ConfigMap**: Centralized environment configuration
- **Service**: ClusterIP service ready for nginx ingress

## Technology Stack

- **Frontend**: SvelteKit 5, TypeScript
- **Styling**: Tailwind CSS 4 with custom components
- **Backend**: SvelteKit API routes (serverless functions)
- **Time Sync**: NTP client with intelligent fallback
- **Adapters**: 
  - `@sveltejs/adapter-netlify` (Serverless)
  - `@sveltejs/adapter-node` (Docker/K8s)
- **Deployment**: Netlify, Docker, Kubernetes

## Project Structure

```
├── src/
│   ├── routes/
│   │   ├── +page.svelte              # Main exam display page
│   │   ├── +layout.svelte            # Layout wrapper
│   │   └── api/
│   │       ├── time/+server.ts       # Time API with NTP sync
│   │       └── health/+server.ts     # Health check endpoint
│   ├── lib/
│   │   ├── ExamClock.svelte          # Main clock component
│   │   ├── SystemStatus.svelte       # Time source status display
│   │   ├── OperatorSidebar.svelte    # Operator controls panel
│   │   ├── CheckpointBanner.svelte   # Checkpoint status display
│   │   └── AnnouncementsBanner.svelte # Announcements display
│   ├── types/
│   │   └── ntp-client.d.ts           # NTP client type definitions
│   ├── app.html                      # HTML template
│   └── app.css                       # Global styles
├── static/                           # Static assets
├── k8s-*.yaml                        # Kubernetes manifests
├── docker-compose.yml               # Docker Compose configuration
├── Dockerfile                       # Multi-stage Docker build
├── netlify.toml                     # Netlify configuration
├── .env.example                     # Environment variables template
└── package.json                     # Dependencies and scripts
```

## Usage Guide

### For Exam Operators

1. **Access Operator Controls**: Click the gear icon in the top-right corner
2. **Set Exam Details**:
   - Configure custom exam title
   - Set exam start and end times
   - Enable/disable checkpoints
   - Add custom announcements

3. **Monitor Time Source**:
   - Green: Full NTP synchronization
   - Indigo: NTP time with estimated metrics
   - Orange: NTP failed, using local time
   - Use "Force NTP" if needed for partial sync

4. **Manage Checkpoints**:
   - Use predefined checkpoints (15min, 30min, etc.)
   - Add custom checkpoints with time, emoji, and color
   - Auto-calculate based on exam duration

5. **Configure Announcements**:
   - Add exam instructions or reminders
   - Choose position (top or left side)
   - Toggle visibility as needed

### For System Administrators

1. **Environment Setup**:
   - Configure NTP server for accurate time
   - Set appropriate timezone
   - Monitor health endpoints

2. **Deployment Monitoring**:
   - Check `/api/health` for system status
   - Monitor NTP sync status in logs
   - Use Kubernetes health checks in production

3. **Troubleshooting**:
   - Enable debug logging for NTP issues
   - Use Force NTP mode for problematic servers
   - Check network connectivity to NTP servers

## Advanced Features

### NTP Synchronization Details
- **Primary Mode**: Full sync with offset/delay metrics
- **Partial Mode**: Time-only sync with estimated metrics
- **Fallback Mode**: Local system time when NTP fails
- **Force Override**: Operator control to trust partial sync
- **Error Handling**: Comprehensive error reporting and logging

### Checkpoint System
- **Visual Indicators**: Color-coded status with emojis
- **Auto-calculation**: Smart scheduling based on exam duration
- **Custom Checkpoints**: Flexible addition of institution-specific milestones
- **Real-time Updates**: Live checkpoint status during exam

### Responsive Design
- **Mobile Optimized**: Full functionality on tablets and phones
- **Large Display Support**: Scales well for classroom projectors
- **Accessibility**: High contrast modes and keyboard navigation
- **Print Friendly**: Clean layout for printed schedules

## Troubleshooting

### Common Issues

**NTP Sync Problems:**
```bash
# Check NTP server connectivity
ntpdate -q ntp.ui.ac.id

# Review application logs for NTP errors
docker logs exam-display

# Test manual NTP sync
curl http://localhost:3000/api/time
```

**Docker Issues:**
```bash
# Check container health
docker ps
docker inspect exam-display

# View detailed logs
docker logs -f exam-display
```

**Kubernetes Issues:**
```bash
# Check pod status
kubectl describe pod -l app=exam-display

# View logs
kubectl logs -l app=exam-display --tail=50

# Test service connectivity
kubectl port-forward svc/exam-display-service 8080:80
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add new NTP server support"`
5. Push to your fork: `git push origin feature/new-feature`
6. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage for critical functions
- Update documentation for new features
- Test NTP functionality with various servers
- Ensure responsive design on all devices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **NTP Servers**: Test with multiple servers for best reliability
- **Deployment**: Refer to DEPLOYMENT.md for detailed deployment guides

---

Built with ❤️ for accurate exam time management
