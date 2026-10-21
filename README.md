# Exam Time Display

A modern web application designed for displaying accurate time during exams with comprehensive exam management features. Built with SvelteKit and supporting `ntp.ui.ac.id` (default for campus-internal consistency) alongside official Indonesian and global NTP servers (`ntp.bsn.go.id` SNSU-BSN Stratum 1, `ntp.bmkg.go.id` BMKG Stratum 2, `time.cloudflare.com`, `time.google.com` Stratum 1). Deployable on Node, Docker, or Kubernetes.

## Projector display and operator console

The projector view uses a large clock and countdown beside a colour-coded exam phase
and notice panel. Press **C** to open or close the operator console, **F** for fullscreen,
and **Esc** to close controls. The Controls button appears when the pointer moves.

The console has four tabs:

- **Exam**: title, start/end times, +5/+10 minute extensions, milestone re-spacing,
  NTP server selection (`ntp.ui.ac.id`, `ntp.bsn.go.id`, `ntp.bmkg.go.id`, `time.cloudflare.com`, `time.google.com`)
  with contextual consistency/drift guidance, authoritative NTP status, manual sync, and explicit
  rehearsal with a time slider.
- **Milestones**: edit the pre-start phase and milestone titles, prompts, colours,
  times, and visibility. Prompts support `{start}`, `{end}`, and `{left}`.
- **Notice**: edit classroom notices, use quick fills, and create bullets with `- `.
- **Screen**: defaults to **Auto** (dynamically fitting the live screen or window aspect ratio
  without black bars), with optional manual 16:9, 16:10, or 4:3 overrides, and reserves up to
  30% at the bottom for audience sightlines, with an optional guide. **High visibility mode** uses bold black
  text on white, with an optional white-on-black inversion, larger seconds and countdown,
  and a simple progress bar. It hides small milestone labels and phase prompts, and shows
  short notices with line breaks preserved. The text limit is shared across all lines.
  The console warns when a notice preview is shortened; saved text stays
  intact. **Show calibration screen** replaces exam timing with contrast bands, sample
  digits, and text sizes for a back-row check under exam lighting. Calibration controls
  also work from the pop-out console, and calibration ends on display reload.

**Pop out** opens a console-only window that synchronizes settings with the display
on the same browser and origin. Keep that window on the operator's own monitor when
using an extended desktop. Changes are saved on the device, and existing exam settings
and announcements migrate automatically. Live timing prefers `ntp.ui.ac.id`;
when synchronization fails, the display continues using the local machine clock in the
configured timezone and marks NTP red. It switches back automatically when NTP recovers.
Rehearsal is labelled on the display and allows simulated failure without changing live
NTP status. Re-spacing affects built-in milestones; extensions move future milestones
along with the deadline.

Run `npm run test:layout` for model, projector layout, migration, error recovery, console,
and pop-out synchronization checks. Install Chromium with `npx playwright install chromium`
if the test browser is missing. To use an installed Chrome browser instead, run
`PLAYWRIGHT_BROWSER_CHANNEL=chrome npm run test:layout`.

## Features

### ⏰ **Advanced Time Management**

- 🌐 **Enforced NTP Synchronization** - Syncs against `ntp.ui.ac.id`
- 🎯 **Partial NTP Support** - Handles NTP servers that return time without valid metrics
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
- `error` - `ntp.ui.ac.id` could not be reached, so no time is served

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

# NTP server is enforced by the application
NTP_SERVER=ntp.ui.ac.id

# Application Port
PORT=3000

# Node Environment
NODE_ENV=production
```

### NTP Configuration

- **Enforced server**: `ntp.ui.ac.id`
- **Partial sync handling**: App accepts NTP time even when offset/delay metrics are unavailable
- **Local clock fallback**: If NTP is unavailable, the API reports an error and the browser displays local machine time with a red NTP indicator

## Development

### Prerequisites

- Node.js 24
- npm

### Setup

```bash
# Install dependencies
npm ci

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

Current validated baseline: the checked-in app is configured for `@sveltejs/adapter-node`.
Docker and Kubernetes are supported by the current build. Netlify deployment notes remain in the repository as legacy configuration and are not part of the validated path.

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
- **Time Sync**: NTP client locked to `ntp.ui.ac.id`
- **Adapter**: `@sveltejs/adapter-node`
- **Deployment**: Node hosting, Docker, Kubernetes

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
   - Red: NTP unavailable, display uses the local machine clock

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
   - Resolve network connectivity to `ntp.ui.ac.id` if the clock reports NTP errors
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
