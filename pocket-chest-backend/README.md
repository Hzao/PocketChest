# PocketChest Backend API

A Cloudflare Worker-based backend for PocketChest - a file and text sharing service.

## Architecture

- **Cloudflare Workers**: Edge computing for API endpoints
- **D1 Database**: SQLite database for metadata storage
- **R2 Storage**: Object storage for files and text content
- **JWT Authentication**: Token-based security for uploads and downloads
- **TOTP Authentication**: Optional two-factor authentication for enhanced security

## API Endpoints

### 1. Get Configuration
```
GET /api/config
```
Returns server configuration including TOTP requirements.

**Response:**
```json
{
  "requireTOTP": true
}
```

### 2. Create Chest
```
POST /api/chest
```
Creates a new upload session and returns an upload token.

**Body (when TOTP is enabled):**
```json
{
  "totpToken": "123456"
}
```

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "uploadToken": "jwt-token",
  "expiresIn": 86400
}
```

### 3. Upload Files
```
POST /api/chest/:sessionId/upload
Authorization: Bearer {uploadToken}
Content-Type: multipart/form-data
```

**Body:**
- `files`: File objects
- `textItems`: JSON strings with `{content, filename?}` format

**Response:**
```json
{
  "uploadedFiles": [
    {
      "fileId": "uuid",
      "filename": "example.txt",
      "isText": false
    }
  ]
}
```

### 4. Multipart Upload (Large Files)

#### 4a. Create Multipart Upload
```
POST /api/chest/:sessionId/multipart/create
Authorization: Bearer {uploadToken}
Content-Type: application/json
```

**Body:**
```json
{
  "filename": "large-file.zip",
  "mimeType": "application/zip",
  "fileSize": 104857600
}
```

**Response:**
```json
{
  "fileId": "uuid",
  "uploadId": "multipart-upload-id",
  "multipartToken": "jwt-token"
}
```

#### 4b. Upload Part
```
PUT /api/chest/:sessionId/multipart/:fileId/part/:partNumber
Authorization: Bearer {multipartToken}
Content-Type: application/octet-stream
```

**Response:**
```json
{
  "etag": "part-etag",
  "partNumber": 1
}
```

#### 4c. Complete Multipart Upload
```
POST /api/chest/:sessionId/multipart/:fileId/complete
Authorization: Bearer {multipartToken}
Content-Type: application/json
```

**Body:**
```json
{
  "parts": [
    {
      "partNumber": 1,
      "etag": "part-etag"
    }
  ]
}
```

**Response:**
```json
{
  "fileId": "uuid"
}
```

### 5. Complete Upload
```
POST /api/chest/:sessionId/complete
Authorization: Bearer {uploadToken}
Content-Type: application/json
```

**Body:**
```json
{
  "fileIds": ["uuid1", "uuid2"],
  "validityDays": 7
}
```

**Response:**
```json
{
  "retrievalCode": "A1B2C3",
  "expiryDate": "2024-01-01T00:00:00Z"
}
```

### 6. Retrieve Chest Contents
```
GET /api/retrieve/:retrievalCode
```

**Response:**
```json
{
  "files": [
    {
      "fileId": "uuid",
      "filename": "example.txt",
      "size": 1024,
      "mimeType": "text/plain",
      "isText": false,
      "fileExtension": "txt"
    }
  ],
  "chestToken": "jwt-token",
  "expiryDate": "2024-01-01T00:00:00Z"
}
```

### 7. Download File
```
GET /api/download/:fileId
Authorization: Bearer {chestToken}
```

Returns the file content with appropriate headers.

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy configuration template
cp wrangler.jsonc.template wrangler.jsonc

# Edit wrangler.jsonc with your database ID and bucket name
```

### Available Scripts
```bash
# Development server
npm run dev

# Run tests
npm test

# Deploy to Cloudflare
npm run deploy

# Generate TypeScript types from Cloudflare
npm run cf-typegen

# Generate TOTP secrets for authentication
npm run generate-totp

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

### Development Server
```bash
npm run dev
```

### Deploy
```bash
npm run deploy
```

## Configuration

### Wrangler Setup
1. Copy the template: `cp wrangler.jsonc.template wrangler.jsonc`
2. Replace `<your-database-id-here>` with your actual D1 database ID
3. Update bucket names if different from defaults
4. Configure custom domain routes if needed

### Environment Variables

#### Required (set via `wrangler secret put`)
- `JWT_SECRET`: Secret key for JWT token signing

#### Optional (set via `wrangler secret put`)
- `TOTP_SECRETS`: Comma-separated TOTP secrets in format `"name1:secret1,name2:secret2"`

#### Configuration Variables (set in wrangler.jsonc)
- `REQUIRE_TOTP`: Set to `"true"` to enable TOTP authentication (default: `"false"`)

### TOTP Authentication Setup

1. **Generate TOTP secrets:**
   ```bash
   npm run generate-totp
   ```

2. **Set TOTP secrets in Cloudflare:**
   ```bash
   wrangler secret put TOTP_SECRETS
   # Enter: user1:JBSWY3DPEHPK3PXP,user2:HXDMVJECJJWSRB3H
   ```

3. **Enable TOTP requirement in wrangler.jsonc:**
   ```json
   "vars": {
     "REQUIRE_TOTP": "true"
   }
   ```

4. **Configure TOTP apps** (Google Authenticator, Authy, etc.) using the generated secrets

## Database Schema

The application uses two main tables:

### Sessions
- `session_id`: Primary key (UUID)
- `retrieval_code`: 6-character alphanumeric code
- `upload_complete`: Boolean flag
- `expiry_date`: Unix timestamp
- `created_at`, `updated_at`: Timestamps

### Files
- `file_id`: Primary key (UUID)
- `session_id`: Foreign key to sessions
- `original_filename`: Original file name
- `mime_type`: MIME type
- `file_size`: Size in bytes
- `file_extension`: File extension
- `is_text`: Boolean flag for text content
- `created_at`: Timestamp

## Security Features

- JWT-based authentication for uploads and downloads
- Session-based access control
- File ownership validation
- Expiry-based cleanup
- CORS support for web frontends
- Optional TOTP two-factor authentication
- Multipart upload support for large files (with separate JWT tokens)

## File Storage

All files (including text content) are stored in Cloudflare R2 with the path structure:
```
{sessionId}/{fileId}
```

Text content is stored as plain text files, and the frontend can differentiate using the `isText` flag in the metadata.

## Multipart Upload Flow

For large files (typically >100MB), use the multipart upload flow:

1. Create multipart upload session
2. Upload file in parts (5MB - 5GB per part)
3. Complete multipart upload with part ETags
4. File is automatically added to the session

This approach provides better reliability for large file uploads and allows for upload resumption.