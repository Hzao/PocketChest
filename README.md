# PocketChest

> Secure, temporary file sharing. Upload files or text, get a code, share anywhere.

PocketChest is a modern file sharing service built with Cloudflare Workers and Pages. Share files and text content securely with automatic expiration and no account required.

## 💡 What is a "Chest"?

A **chest** is simply a collection of files and text that you upload together. Each chest gets a unique 6-character code (like `ABC123`) that you share with others to download everything inside it.

## ✨ Features

- 📤 **File & Text Sharing** - Upload files or paste text content (optionally restrict uploads to trusted users with TOTP authentication)
- 📦 **Large File Support** - Handles files up to 200GB using multipart uploads to Cloudflare R2
- 🔐 **Secure Codes** - 6-character retrieval codes for access
- ⏰ **Auto Expiry** - Files expire after 1, 3, 7, or 15 days (or permanent)
- 🚀 **No Registration** - No accounts, just upload and share
- 🔐 **Optional TOTP Auth** - Restrict access with authenticator apps  
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Fast** - Built on Cloudflare's global edge network

## 📺 Demo

### Upload & Share (15 seconds, with TOTP protected)
![Upload Demo](assets/pocket-chest-upload-demo.gif)

### Retrieve Files (10 seconds)  
![Retrieve Demo](assets/pocket-chest-retrieve-demo.gif)

## 🏗️ Architecture

- **Backend**: Cloudflare Workers + D1 Database + R2 Storage
- **Frontend**: Next.js 14 + Tailwind CSS (deployed on Cloudflare Pages)
- **Language**: TypeScript

## 🚀 Quick Start

For complete deployment instructions, see **[DEPLOYMENT.md](DEPLOYMENT.md)**

### Prerequisites
- Cloudflare account with a domain
- Wrangler CLI

### Local Development

**First, copy the template files:**
```bash
# Copy configuration templates
cp pocket-chest-backend/wrangler.jsonc.template pocket-chest-backend/wrangler.jsonc
cp pocket-chest-frontend/.env.local.template pocket-chest-frontend/.env.local
```

**Backend:**
```bash
cd pocket-chest-backend
npm install
npm run dev  # http://localhost:8787
```

**Frontend:**
```bash
cd pocket-chest-frontend
npm install
npm run dev  # http://localhost:3000
```

## 📁 Project Structure

```
PocketChest-OpenSource/
├── assets/                        # Demo assets
│   ├── pocket-chest-upload-demo.gif
│   └── pocket-chest-retrieve-demo.gif
│
├── pocket-chest-backend/          # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts              # Main worker entry point
│   │   ├── schema.sql            # Database schema
│   │   ├── types.ts              # TypeScript types
│   │   └── utils.ts              # Utility functions
│   ├── test/                     # Test suite
│   │   ├── auth.spec.ts          # Authentication tests
│   │   ├── chest-creation.spec.ts # Chest creation tests
│   │   ├── file-upload.spec.ts   # File upload tests
│   │   ├── multipart-upload.spec.ts # Large file upload tests
│   │   ├── retrieval.spec.ts     # File retrieval tests
│   │   ├── utils/                # Test utilities
│   │   │   ├── test-factories.ts
│   │   │   ├── test-helpers.ts
│   │   │   └── test-setup.ts
│   │   └── ...                   # Additional test files
│   ├── scripts/                  # Utility scripts
│   │   ├── generate-secrets.js   # Secret generation
│   │   └── test-ci.sh           # CI test script
│   ├── wrangler.jsonc           # Cloudflare configuration
│   ├── wrangler.jsonc.template  # Configuration template
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── vitest.config.mts        # Test configuration
│   └── eslint.config.js         # Linting configuration
│
├── pocket-chest-frontend/         # Next.js frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── page.tsx         # Home page
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── globals.css      # Global styles
│   │   │   ├── share/           # Upload/share page
│   │   │   │   └── page.tsx
│   │   │   └── retrieve/        # File retrieval page
│   │   │       └── page.tsx
│   │   ├── components/           # React components
│   │   │   ├── FileUpload.tsx   # File upload component
│   │   │   ├── TextInput.tsx    # Text input component
│   │   │   ├── UploadProgress.tsx # Upload progress display
│   │   │   ├── RetrieveClient.tsx # File retrieval interface
│   │   │   ├── TOTPModal.tsx    # TOTP authentication modal
│   │   │   └── ExpirySelector.tsx # Expiration time selector
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── usePocketChest.ts # Main API hook
│   │   └── lib/                 # API client & types
│   │       ├── api.ts           # API client functions
│   │       └── types.ts         # TypeScript types
│   ├── public/                  # Static assets
│   │   └── favicon.png
│   ├── package.json             # Dependencies
│   ├── next.config.js           # Next.js configuration
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── postcss.config.js        # PostCSS config
│   ├── tsconfig.json            # TypeScript config
│   └── _headers                 # Cloudflare Pages headers
│
├── DEPLOYMENT.md                  # Deployment guide
├── LICENSE                        # MIT license
└── README.md                      # This file
```

## 🔒 Security Features

- **TOTP Authentication** - Optional two-factor authentication
- **JWT Session Tokens** - Secure session management
- **Auto Expiration** - Files automatically deleted after expiry
- **Automated Cleanup** - Hourly cron job removes expired content
- **Input Validation** - File type and size restrictions

## 🚢 Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete deployment instructions including:
- Cloudflare Workers setup
- D1 database configuration
- R2 storage setup
- TOTP authentication setup
- Custom domain configuration
- Environment variables
- Troubleshooting guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. Use at your own risk.