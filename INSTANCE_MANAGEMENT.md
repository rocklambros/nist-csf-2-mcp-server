# MCP Server Instance Management

The NIST CSF 2.0 MCP Server includes robust instance management to prevent conflicts and ensure clean shutdown when sessions end.

## Features

### Duplicate Instance Prevention
- Automatically detects and prevents multiple server instances from running simultaneously
- Uses a lock file system to track active instances
- Protects against port conflicts and resource contention

### Graceful Shutdown
- Handles termination signals (SIGTERM, SIGINT, SIGQUIT, SIGHUP) gracefully
- Properly closes database connections and cleans up resources
- Removes lock files on shutdown to prevent stale state

### Force Termination
- Supports forced termination of existing instances when needed
- Environment variable `FORCE_TERMINATE=true` enables this behavior
- Useful for automated deployments and recovery scenarios

## How It Works

### Lock File System
The server creates a lock file at `/tmp/nist-csf-mcp-server.lock` containing:
```json
{
  "pid": 12345,
  "startTime": "2025-08-29T20:30:38.875Z",
  "transport": "stdio",
  "version": "1.0.0"
}
```

### Instance Detection Process
1. **Startup Check**: On startup, checks if lock file exists
2. **Process Validation**: Verifies if the PID in lock file is still running
3. **Stale Lock Cleanup**: Removes lock files for terminated processes
4. **Instance Prevention**: Blocks startup if active instance detected

### Shutdown Sequence
1. **Signal Reception**: Receives termination signal
2. **Resource Cleanup**: Closes database connections and server transport
3. **Lock File Removal**: Cleans up lock file
4. **Process Exit**: Exits with appropriate code

## Usage

### Normal Operation
```bash
# Start MCP server (will fail if another instance is running)
node dist/index.js
```

### Force Termination
```bash
# Terminate existing instance and start new one
FORCE_TERMINATE=true node dist/index.js
```

### Docker Usage
```bash
# Normal Docker operation
docker run -i --rm ghcr.io/rocklambros/nist-csf-2-mcp-server:latest

# Force terminate existing instance
docker run -i --rm -e FORCE_TERMINATE=true ghcr.io/rocklambros/nist-csf-2-mcp-server:latest
```

## Client Integration

### Claude Desktop
Claude Desktop automatically handles server lifecycle. When you:
- **Exit Claude Code**: Server receives SIGTERM and shuts down gracefully
- **Restart Claude Desktop**: Any stale processes are cleaned up automatically
- **Switch Projects**: Previous instances are terminated cleanly

### Custom Clients
For custom MCP clients, ensure you:
1. Send SIGTERM to the server process when done
2. Wait for graceful shutdown (up to 5 seconds)
3. Use SIGKILL if server doesn't respond to SIGTERM

## Troubleshooting

### Multiple Instances Error
```
[error]: Another MCP server instance is already running
```

**Solutions**:
1. Wait for existing instance to finish
2. Use `FORCE_TERMINATE=true` environment variable
3. Manually clean lock file: `rm /tmp/nist-csf-mcp-server.lock`

### Stale Lock Files
If you see repeated "Removing stale lock file" messages, it indicates:
- Previous instances crashed without cleanup
- System was forcibly shut down
- Normal behavior - the server will clean up and continue

### Server Won't Start
1. Check for existing processes: `ps aux | grep "nist-csf"`
2. Remove lock file manually: `rm /tmp/nist-csf-mcp-server.lock`
3. Verify permissions on temp directory
4. Check server logs for detailed error information

## Development & Testing

### Testing Instance Management
```bash
# Run the instance management test suite
node test-instance-management.js
```

### Manual Testing
```bash
# Terminal 1: Start first instance
node dist/index.js

# Terminal 2: Try to start second instance (should fail)
node dist/index.js

# Terminal 3: Force start new instance (should work)
FORCE_TERMINATE=true node dist/index.js
```

## Security Considerations

- Lock files are created in system temp directory with appropriate permissions
- PID validation prevents race conditions
- Force termination requires explicit environment variable
- All shutdown operations are logged for audit purposes
- No sensitive information is stored in lock files

## Docker Considerations

The Docker implementation includes:
- **Signal Forwarding**: `dumb-init` properly forwards signals to Node.js process
- **Container Lifecycle**: Handles Docker stop/restart signals appropriately  
- **Volume Persistence**: Lock files in temp directory (ephemeral per container)
- **Multi-Container**: Each container maintains its own instance lock

This ensures Claude Desktop and other MCP clients can reliably connect and disconnect without conflicts.