-- Sessions table: tracks upload sessions and their state
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,           -- UUID v4
    retrieval_code TEXT UNIQUE,            -- 6-char alphanumeric (A-Z, 0-9)
    upload_complete BOOLEAN DEFAULT FALSE,
    expiry_date INTEGER,                   -- Unix timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Files table: metadata for uploaded files (all content stored in R2)
CREATE TABLE IF NOT EXISTS files (
    file_id TEXT PRIMARY KEY,              -- UUID v4
    session_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT,
    is_text BOOLEAN DEFAULT FALSE,         -- TRUE for text content
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_retrieval_code ON sessions(retrieval_code);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);