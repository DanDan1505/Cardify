const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
// In-memory storage for shared cards
const sharedCards = {};

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://cardify-2t03safv1-dandan1505s-projects.vercel.app'
  ]
}));

// Middleware to parse JSON and increase limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getInitials = (name = 'Card') => String(name)
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word.charAt(0).toUpperCase())
  .join('') || 'C';

const getSafePdfName = (name = 'Card') => {
  const safeName = String(name)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ');

  return safeName || 'Card';
};

const normalizeLink = (value = '') => {
  if (!value) return '';
  return value.startsWith('http') ? value : `https://${value}`;
};

const normalizeImageSrc = (imageUrl = '') => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) return imageUrl;
  return imageUrl;
};

const generateCardMarkup = (cardData, options = {}) => {
  const name = cardData.name || 'Card';
  const bio = cardData.bio || '';
  const email = cardData.email || '';
  const phone = cardData.phone || '';
  const linkedin = cardData.linkedin || '';
  const imageUrl = normalizeImageSrc(cardData.imageUrl || '');
  const pageBreakStyle = options.pageBreakAfter ? 'page-break-after: always;' : '';
  const safeName = escapeHtml(name);
  const safeLinkedinUrl = escapeHtml(normalizeLink(linkedin));

  return `
    <section style="${pageBreakStyle} width: 100%; min-height: 1040px; box-sizing: border-box; padding: 40px 0; background: #f8fafc;">
      <article style="width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
        <div style="width: 100%; height: 300px; background: #e2e8f0; overflow: hidden;">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${safeName}" style="width: 100%; height: 300px; object-fit: cover; object-position: top center;" />`
            : `<div style="width: 100%; height: 100%; background: #e2e8f0; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 84px; line-height: 1; font-weight: 700;">${escapeHtml(getInitials(name))}</div>`}
        </div>
        <div style="padding: 34px 38px 38px; background: #ffffff;">
          <h1 style="margin: 0 0 18px; font-size: 30px; line-height: 1.2; font-weight: 700; color: #0f172a;">${safeName}</h1>
          ${bio ? `<p style="margin: 0 0 22px; font-size: 15px; line-height: 1.65; color: #475569; white-space: pre-wrap;">${escapeHtml(bio)}</p>` : ''}
          <div style="margin-top: 8px; font-size: 14px; line-height: 1.55; color: #334155;">
            ${email ? `<div style="margin-bottom: 10px; word-break: break-word;"><strong style="color: #64748b;">Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(email)}</a></div>` : ''}
            ${phone ? `<div style="margin-bottom: 10px; word-break: break-word;"><strong style="color: #64748b;">Phone:</strong> ${escapeHtml(phone)}</div>` : ''}
            ${linkedin ? `<div style="word-break: break-word;"><strong style="color: #64748b;">LinkedIn:</strong> <a href="${safeLinkedinUrl}" style="color: #2563eb; text-decoration: none;">${escapeHtml(linkedin)}</a></div>` : ''}
          </div>
        </div>
      </article>
    </section>`;
};

const generateSingleCardHTML = (cardData) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cardData.name || 'Card')} - Profile Card</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
  ${generateCardMarkup(cardData)}
</body>
</html>`;

const generateAllCardsHTML = (cards) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cardify - All Cards</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
  ${cards.map((card, index) => generateCardMarkup(card, { pageBreakAfter: index < cards.length - 1 })).join('')}
</body>
</html>`;

const generatePdfBuffer = async (htmlContent) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1100 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * POST /api/export-card - Export a single card as PDF
 * Body:
 *   - name: Person's name
 *   - bio: Short biography
 *   - email: Email address
 *   - phone: Phone number
 *   - linkedin: LinkedIn URL
 *   - imageUrl: Base64 encoded image or data URL
 */
app.post('/api/export-card', async (req, res) => {
  const { name, bio, email, phone, linkedin, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  try {
    console.log(`[Cardify Server] Starting export for card: ${name}`);
    const htmlContent = generateSingleCardHTML({
      name,
      bio: bio || '',
      email: email || '',
      phone: phone || '',
      linkedin: linkedin || '',
      imageUrl: imageUrl || '',
    });

    const pdfBuffer = await generatePdfBuffer(htmlContent);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${getSafePdfName(name)}.pdf"`);
    res.set('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    console.log(`[Cardify Server] PDF generated successfully for ${name}: ${pdfBuffer.length} bytes`);

  } catch (error) {
    console.error('[Cardify Server] Error exporting card:', error.message);
    res.status(500).json({ error: `Failed to export card: ${error.message}` });
  }
});

/**
 * POST /api/export-all - Export multiple cards as multi-page PDF
 * Body:
 *   - cards: Array of card objects with name, bio, email, phone, linkedin, imageUrl
 */
app.post('/api/export-all', async (req, res) => {
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Missing or empty cards array' });
  }

  try {
    console.log(`[Cardify Server] Starting export for ${cards.length} cards`);
    const normalizedCards = cards.map((card) => ({
      name: card.name || 'Card',
      bio: card.bio || '',
      email: card.email || '',
      phone: card.phone || '',
      linkedin: card.linkedin || '',
      imageUrl: card.imageUrl || '',
    }));
    const htmlContent = generateAllCardsHTML(normalizedCards);
    const pdfBuffer = await generatePdfBuffer(htmlContent);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="Cardify-All-Cards.pdf"');
    res.set('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    console.log(`[Cardify Server] Multi-page PDF generated successfully: ${cards.length} cards, ${pdfBuffer.length} bytes`);

  } catch (error) {
    console.error('[Cardify Server] Error exporting all cards:', error.message);
    res.status(500).json({ error: `Failed to export cards: ${error.message}` });
  }
});

/**
 * GET /api/image - Proxy endpoint to fetch Google Drive images
 * Query params:
 *   - fileId: Google Drive file ID
 *   - token: OAuth access token
 */
app.get('/api/image', async (req, res) => {
  const { fileId, token } = req.query;

  if (!fileId) {
    return res.status(400).json({ error: 'Missing fileId parameter' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Missing token parameter' });
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    console.log(`[Cardify Server] Fetching image for fileId: ${fileId}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`[Cardify Server] Drive API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Google Drive API error: ${response.statusText}` 
      });
    }

    // Get the content type from the Drive API response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log(`[Cardify Server] Successfully fetched image, content-type: ${contentType}`);

    // Set the correct Content-Type header
    res.set('Content-Type', contentType);
    
    // Convert response to buffer and send
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.error('[Cardify Server] Error fetching image:', error.message);
    res.status(500).json({ 
      error: `Failed to fetch image: ${error.message}` 
    });
  }
});

/**
 * POST /api/share - Create a share link for cards
 * Body:
 *   - cards: Array of card objects with name, bio, email, phone, linkedin, imageUrl
 * Returns:
 *   - shareUrl: The URL to share ({clientOrigin}/share/{id})
 *   - shareId: The unique share ID
 */
app.post('/api/share', (req, res) => {
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Missing or empty cards array' });
  }

  try {
    // Generate unique ID
    const shareId = uuidv4();
    
    // Store cards in memory
    sharedCards[shareId] = cards;
    
    console.log(`[Cardify Server] Created share link for ${cards.length} cards with ID: ${shareId}`);
    
    const clientOrigin = ALLOWED_ORIGINS.includes(req.get('origin'))
      ? req.get('origin')
      : 'http://localhost:5173';

    res.json({
      shareId,
      shareUrl: `${clientOrigin}/share/${shareId}`,
    });
  } catch (error) {
    console.error('[Cardify Server] Error creating share link:', error.message);
    res.status(500).json({ error: `Failed to create share link: ${error.message}` });
  }
});

/**
 * GET /api/share/:id - Retrieve shared cards
 * Params:
 *   - id: The share ID
 * Returns:
 *   - cards: Array of card objects
 */
app.get('/api/share/:id', (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing share ID' });
  }
  
  const cards = sharedCards[id];
  
  if (!cards) {
    return res.status(404).json({ error: 'Share link not found or has expired' });
  }
  
  console.log(`[Cardify Server] Retrieved shared cards for ID: ${id} (${cards.length} cards)`);
  
  res.json({ cards });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cardify server is running' });
});

/**
 * Test endpoint to confirm server is reachable
 */
app.get('/', (req, res) => {
  res.send('Cardify backend is running');
});

app.listen(PORT, () => {
  console.log(`[Cardify Server] Running on http://localhost:${PORT}`);
  console.log(`[Cardify Server] Image proxy endpoint: GET /api/image?fileId=FILE_ID&token=TOKEN`);
});
