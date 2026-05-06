const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// In-memory storage for shared cards
const sharedCards = {};

// Allow local Vite dev server origins.
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://localhost:5177',
    'http://127.0.0.1:5177',
    'http://localhost:5178',
    'http://127.0.0.1:5178',
    'http://localhost:5179',
    'http://127.0.0.1:5179',
    'http://localhost:5180',
    'http://127.0.0.1:5180',
    'http://localhost:5181',
    'http://127.0.0.1:5181',
    'http://localhost:5182',
    'http://127.0.0.1:5182',
  ],
  credentials: true,
}));

// Middleware to parse JSON and increase limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

/**
 * Generate complete self-contained HTML for a single card with inline styles
 */
function generateCardHTML(cardData) {
  const { name, bio, email, phone, linkedin, imageUrl } = cardData;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Profile Card</title>
</head>
<body style="margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; background: white; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Profile Image -->
    <div style="width: 100%; height: 280px; background: #e2e8f0; overflow: hidden;">
      ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />` : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #cbd5e1, #94a3b8); display: flex; align-items: center; justify-content: center; font-size: 80px; font-weight: bold; color: #475569;">${name.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('')}</div>`}
    </div>
    
    <!-- Content Area -->
    <div style="padding: 32px; background: white;">
      <!-- Name -->
      <div style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 16px; line-height: 1.3;">
        ${name}
      </div>
      
      <!-- Bio -->
      ${bio ? `<div style="font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.5;">
        ${bio}
      </div>` : ''}
      
      <!-- Email -->
      ${email ? `<div style="font-size: 14px; color: #334155; margin-bottom: 12px;">
        <strong style="color: #64748b;">Email:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
      </div>` : ''}
      
      <!-- Phone -->
      ${phone ? `<div style="font-size: 14px; color: #334155; margin-bottom: 12px;">
        <strong style="color: #64748b;">Phone:</strong> ${phone}
      </div>` : ''}
      
      <!-- LinkedIn -->
      ${linkedin ? `<div style="font-size: 14px; color: #334155;">
        <strong style="color: #64748b;">LinkedIn:</strong> <a href="${linkedin.startsWith('http') ? linkedin : 'https://' + linkedin}" style="color: #2563eb; text-decoration: none;">${linkedin}</a>
      </div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

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

  let browser;
  try {
    console.log(`[Cardify Server] Starting export for card: ${name}`);
    
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 800, height: 1100 });

    // Generate HTML
    const htmlContent = generateCardHTML({
      name,
      bio: bio || '',
      email: email || '',
      phone: phone || '',
      linkedin: linkedin || '',
      imageUrl: imageUrl || '',
    });

    console.log(`[Cardify Server] Loading HTML for: ${name}`);
    
    // Set content and wait for rendering
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    // Wait for Puppeteer to finish rendering
    console.log(`[Cardify Server] Waiting for render to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF
    console.log(`[Cardify Server] Generating PDF for: ${name}`);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    // Set response headers
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${name}.pdf"`);

    // Send PDF
    res.send(pdfBuffer);
    console.log(`[Cardify Server] PDF generated successfully for ${name}: ${pdfBuffer.length} bytes`);

  } catch (error) {
    console.error('[Cardify Server] Error exporting card:', error.message);
    res.status(500).json({ error: `Failed to export card: ${error.message}` });
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[Cardify Server] Browser closed for: ${name}`);
    }
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

  let browser;
  try {
    console.log(`[Cardify Server] Starting export for ${cards.length} cards`);
    
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 800, height: 1100 });

    // Build combined HTML with page breaks
    let combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cardify - All Cards</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>`;

    // Add each card with page break
    cards.forEach((cardData, index) => {
      const { name, bio, email, phone, linkedin, imageUrl } = cardData;
      const cardHtml = generateCardHTML({ name, bio: bio || '', email: email || '', phone: phone || '', linkedin: linkedin || '', imageUrl: imageUrl || '' });
      
      // Extract just the body content
      const bodyMatch = cardHtml.match(/<body[^>]*>([\s\S]*)<\/body>/);
      const bodyContent = bodyMatch ? bodyMatch[1] : '';
      
      combinedHtml += `<div class="page-break">${bodyContent}</div>`;
    });

    combinedHtml += `</body></html>`;

    console.log(`[Cardify Server] Loading HTML with ${cards.length} cards for multi-page export`);
    
    // Set content
    await page.setContent(combinedHtml, { waitUntil: 'domcontentloaded' });
    
    // Wait for rendering
    console.log(`[Cardify Server] Waiting for render to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate multi-page PDF
    console.log(`[Cardify Server] Generating multi-page PDF...`);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    // Set response headers
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="Cardify-All-Cards.pdf"');

    // Send PDF
    res.send(pdfBuffer);
    console.log(`[Cardify Server] Multi-page PDF generated successfully: ${cards.length} cards, ${pdfBuffer.length} bytes`);

  } catch (error) {
    console.error('[Cardify Server] Error exporting all cards:', error.message);
    res.status(500).json({ error: `Failed to export cards: ${error.message}` });
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[Cardify Server] Browser closed for multi-page export`);
    }
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
 *   - shareUrl: The URL to share (http://localhost:5173/share/{id})
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
    
    // Return share URL
    res.json({
      shareId,
      shareUrl: `http://localhost:5173/share/${shareId}`,
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
