# Exam Time Display - Docker Deployment Guide

## Overview
The Exam Time Display application is a real-time clock and announcement system designed for projector use in exam settings. It features comprehensive operator controls, customizable display options, and is optimized for Docker deployment.

## Features
- **Real-time Clock**: Updates every second with server synchronization
- **Exam Management**: Start/end times with auto-calculated checkpoints
- **Visual Checkpoints**: Color-coded clock display with milestone alerts
- **Announcements System**: Flexible positioning and operator controls
- **Customizable Title**: Operator-configurable display title
- **Responsive Design**: Adapts to different screen sizes and projector displays

## Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- Port 3000 available on your system

### 1. Clone and Deploy
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd exam-display

# Build and start the application
docker-compose up -d
```

### 2. Access the Application
- **Main Display**: http://localhost:3000
- **Operator Controls**: Click the settings button (⚙️) in the top-right corner

### 3. Stop the Application
```bash
docker-compose down
```

## Manual Docker Build

### Build the Image
```bash
docker build -t exam-display .
```

### Run the Container
```bash
docker run -d \
  --name exam-display \
  -p 3000:3000 \
  --restart unless-stopped \
  exam-display
```

## Configuration Options

### Environment Variables
The application supports these environment variables:

- `PORT` (default: 3000): Port the application listens on
- `HOST` (default: 0.0.0.0): Host interface to bind to
- `NODE_ENV` (default: production): Node.js environment

### Docker Compose Customization
Edit `docker-compose.yml` to customize:

1. **Port Mapping**: Change `"3000:3000"` to use a different external port
2. **Resource Limits**: Uncomment the deploy section to limit CPU/memory
3. **Logging**: Uncomment logging section for log rotation

Example for different port:
```yaml
ports:
  - "8080:3000"  # Access via http://localhost:8080
```

## Using the Application

### For Operators
1. **Open Operator Panel**: Click the settings icon (⚙️)
2. **Set Exam Times**: Configure start and end times
3. **Manage Checkpoints**: Enable/disable or create custom checkpoints
4. **Customize Display**: 
   - Change the main title
   - Position announcements (top or left)
   - Add/edit announcements
5. **Monitor Status**: View real-time checkpoint status

### For Display
- The main clock automatically updates in real-time
- Checkpoint alerts appear as colored banners with emojis
- Announcements display according to operator settings
- Clock colors change based on active checkpoints

## Health Monitoring

The application includes built-in health checks:
- **Docker Health Check**: Automatic container health monitoring
- **API Endpoint**: `/api/health` for external monitoring
- **Time Sync**: `/api/time` for server time synchronization

### Check Application Status
```bash
# View container health
docker-compose ps

# Check logs
docker-compose logs exam-display

# Follow logs in real-time
docker-compose logs -f exam-display
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in docker-compose.yml or stop conflicting service
   sudo lsof -i :3000
   ```

2. **Container Won't Start**
   ```bash
   # Check logs for errors
   docker-compose logs exam-display
   
   # Rebuild if needed
   docker-compose down
   docker-compose up --build
   ```

3. **Time Synchronization Issues**
   - Check browser console for error messages
   - Verify `/api/time` endpoint is accessible
   - Ensure container has proper network access

### Performance Optimization

For projector use and optimal performance:

1. **Browser Settings**:
   - Use full-screen mode (F11)
   - Disable browser notifications
   - Set display to never sleep

2. **System Resources**:
   - The container uses minimal resources (~50MB RAM)
   - CPU usage is very low during normal operation
   - Consider enabling resource limits in production

## Security Considerations

- Application runs as non-root user inside container
- No sensitive data is stored or transmitted
- All operator settings are stored in browser localStorage
- Health check endpoint provides minimal system information

## Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Container Development
```bash
# Build development image
docker build -t exam-display:dev .

# Run with volume mount for development
docker run -it \
  -p 3000:3000 \
  -v $(pwd):/app \
  exam-display:dev
```

## Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### Backup Considerations
- No persistent data is stored in the container
- Operator settings are stored in browser localStorage
- Consider documenting standard exam configurations

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review container logs for error messages
3. Verify all prerequisites are met
4. Ensure network connectivity to the application

---

**Note**: This application is designed for exam environments where reliable time display and operator control are essential. The Docker deployment ensures consistent behavior across different systems and easy setup for exam administrators.
