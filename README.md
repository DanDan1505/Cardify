# Cardify

Cardify turns Google Sheets rows into clean profile cards that can be viewed, shared, and exported as PDFs.

The app has a React + Vite frontend and an Express backend. The frontend handles Google sign-in, sheet selection, template mapping, cards, shared card pages, and image lightboxes. The backend proxies private Google Drive images, stores temporary share links in memory, and generates PDF exports with Puppeteer.

## Features

- Google OAuth sign-in with read-only Sheets and Drive scopes
- Google Drive spreadsheet picker
- Sheet/tab selection and column mapping
- Built-in templates plus custom template creation
- Profile card grid with image fallback initials
- Google Drive image proxy for private uploaded images
- Full-screen profile image lightbox
- Shared cards page at `/share/:id`
- Single-card and all-card PDF export with Puppeteer
- Shared profile image download as JPG

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- Lucide React icons
- Express
- Puppeteer
- Google Identity Services
- Google Drive API
- Google Sheets API

## Project Structure

```text
Cardify/
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  src/
    App.jsx
    main.jsx
    index.css
    config/
      api.js
    hooks/
      useTemplates.js
    pages/
      Landing.jsx
      TemplateSelection.jsx
      TemplateBuilder.jsx
      CardsDisplay.jsx
      SharedCards.jsx
    utils/
      googleDriveImages.js
      googleSheetsAPI.js
  server/
    package.json
    server.js
```

## Requirements

- Node.js 18 or newer
- npm
- A Google OAuth client ID configured for the browser origins you use locally, such as:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

## Setup

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
cd ..
```

Optional environment file:

```bash
cp .env.example .env
```

The frontend uses `VITE_API_BASE_URL` for backend requests. If the variable is not set, it defaults to:

```text
http://localhost:3001
```

## Development

Start the backend in one terminal:

```bash
npm run dev:server
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Backend API

### `GET /`

Health-style root endpoint. Returns a simple text response when the backend is running.

### `GET /health`

Returns JSON server health status.

### `GET /api/image?fileId=FILE_ID&token=ACCESS_TOKEN`

Fetches a Google Drive file through the backend and returns the image bytes. Used for private profile pictures from Google Forms/Drive uploads.

### `POST /api/export-card`

Generates a single-card PDF.

```json
{
  "name": "Person's Full Name",
  "bio": "Short professional biography text",
  "email": "email@example.com",
  "phone": "+233xxxxxxxxx",
  "linkedin": "https://linkedin.com/in/username",
  "imageUrl": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### `POST /api/export-all`

Generates a multi-page PDF from an array of cards.

```json
{
  "cards": [
    {
      "name": "Person's Full Name",
      "bio": "Short professional biography text",
      "email": "email@example.com",
      "phone": "+233xxxxxxxxx",
      "linkedin": "https://linkedin.com/in/username",
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQ..."
    }
  ]
}
```

### `POST /api/share`

Creates an in-memory share link for card data.

### `GET /api/share/:id`

Returns cards for a previously created share link.

## PDF Export Notes

PDF export is handled in `server/server.js` with Puppeteer.

- Uses A4 pages with `printBackground: true`
- Uses complete HTML documents with inline styles
- Embeds base64 profile images directly in the page
- Uses `object-position: top center` to keep faces visible
- Uses `page-break-after: always` between cards in all-card export

## Build

Build the frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Check backend syntax:

```bash
node --check server/server.js
```

## Notes

Share links are stored in memory on the backend. Restarting the server clears existing share links. For production, replace this with persistent storage.
