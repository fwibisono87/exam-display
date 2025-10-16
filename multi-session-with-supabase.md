# Multi-Session Sharing with Supabase

## Overview

This document outlines the implementation plan for adding session sharing functionality to the Exam Display application using Supabase as the backend service. The feature will allow one "master" session to generate and share a 6-digit code, which other sessions can use to connect and mirror the master session's configuration and state.

## Feature Requirements

1. **Master Session**:
   - Generate a unique 6-digit code
   - Broadcast session settings and state changes to followers
   - Display connected follower count
   - Option to disconnect/revoke access

2. **Follower Sessions**:
   - Connect to a master session via 6-digit code
   - Receive real-time updates of all settings
   - Clear visual indication of being in "follower mode"
   - Option to disconnect and return to standalone mode

3. **Shared State**:
   - Exam timings (start/end)
   - Checkpoint configurations
   - Active/next checkpoint status
   - High contrast mode setting
   - Announcements
   - Time format (12h/24h)
   - Custom title

## Supabase Setup

### 1. Project Creation

1. Create a new Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Note the project URL and anon key for configuration

### 2. Database Tables

#### `shared_sessions` Table

```sql
CREATE TABLE shared_sessions (
  id SERIAL PRIMARY KEY,
  session_code VARCHAR(6) NOT NULL UNIQUE,
  master_client_id UUID NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index for faster lookups by session code
CREATE INDEX idx_shared_sessions_code ON shared_sessions (session_code);

-- Index for expiration cleanup
CREATE INDEX idx_shared_sessions_expires_at ON shared_sessions (expires_at);
```

#### `session_followers` Table

```sql
CREATE TABLE session_followers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES shared_sessions(id) ON DELETE CASCADE,
  follower_client_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Enforce uniqueness of follower within a session
  UNIQUE(session_id, follower_client_id)
);

-- Index for counting followers per session
CREATE INDEX idx_session_followers_session_id ON session_followers (session_id);
```

### 3. Row Level Security Policies

```sql
-- Enable RLS on the tables
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_followers ENABLE ROW LEVEL SECURITY;

-- Policies for shared_sessions
CREATE POLICY "Allow read access to sessions by code" ON shared_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for new sessions" ON shared_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update by master client" ON shared_sessions
  FOR UPDATE USING (master_client_id::text = auth.uid()::text);

-- Policies for session_followers
CREATE POLICY "Allow insert for new followers" ON session_followers
  FOR INSERT WITH CHECK (follower_client_id::text = auth.uid()::text);

CREATE POLICY "Allow read for session participants" ON session_followers
  FOR SELECT USING (
    follower_client_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM shared_sessions
      WHERE id = session_followers.session_id
      AND master_client_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Allow update for own follower record" ON session_followers
  FOR UPDATE USING (follower_client_id::text = auth.uid()::text);

CREATE POLICY "Allow delete for own follower record" ON session_followers
  FOR DELETE USING (follower_client_id::text = auth.uid()::text);
```

### 4. Database Functions

```sql
-- Function to generate a unique 6-digit code
CREATE OR REPLACE FUNCTION generate_unique_session_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit number
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM shared_sessions WHERE session_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new shared session
CREATE OR REPLACE FUNCTION create_shared_session(client_id UUID, initial_data JSONB)
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
BEGIN
  -- Generate a unique code
  SELECT generate_unique_session_code() INTO new_code;
  
  -- Create session record (expires after 24 hours)
  INSERT INTO shared_sessions (
    session_code, 
    master_client_id, 
    session_data, 
    expires_at
  ) VALUES (
    new_code, 
    client_id, 
    initial_data, 
    NOW() + INTERVAL '24 hours'
  );
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shared_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. Real-time Subscriptions

Set up Supabase real-time functionality:

1. Enable Realtime features in the Supabase dashboard
2. Enable database changes publication:

```sql
-- Enable realtime for session data updates
ALTER PUBLICATION supabase_realtime 
  ADD TABLE shared_sessions, session_followers;
```

### 6. Scheduled Jobs

Set up a job to regularly clean up expired sessions:

```sql
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',  -- Run hourly
  'SELECT cleanup_expired_sessions();'
);
```

## Integration with Exam Display

### New Components and Files to Create

1. `src/lib/supabase.ts` - Supabase client and utility functions
2. `src/lib/SessionSharingPanel.svelte` - UI for session sharing controls
3. `src/lib/session-store.ts` - Svelte store for managing session state
4. `src/routes/api/session/[code]/+server.ts` - API endpoint for validating session codes

### Required Dependencies

Add to `package.json`:
```json
"dependencies": {
  "@supabase/supabase-js": "^2.38.0",
  "nanoid": "^5.0.2"
}
```

## Implementation Strategy

### Phase 1: Setup and Basic Structure

1. Install required dependencies
2. Set up Supabase client and environment variables
3. Create session store and basic UI components

### Phase 2: Master Session Functionality

1. Implement session code generation
2. Create UI for sharing the code
3. Develop system for broadcasting state changes

### Phase 3: Follower Session Functionality

1. Implement code input and validation
2. Create real-time subscription to master session
3. Implement state synchronization

### Phase 4: Polish and Error Handling

1. Add status indicators and connected user counts
2. Implement error recovery mechanisms
3. Add session expiration handling

## Security Considerations

1. No sensitive data should be shared through this system
2. Session codes are valid for 24 hours only
3. Master sessions can revoke access at any time
4. All communication happens through Supabase's secure channels

## Testing Strategy

1. Test session code generation and uniqueness
2. Verify real-time updates with multiple browser instances
3. Test error cases (invalid codes, network issues)
4. Verify session expiration and cleanup

---

This implementation will provide a seamless way for multiple displays to stay in sync during exam sessions, ensuring consistent information across different locations or devices.
