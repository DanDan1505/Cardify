# Cardify

A beautiful, minimal web app that turns Google Sheets into stunning cards. Built with React, Vite, and Tailwind CSS.

## Design Philosophy

- Clean, minimal aesthetic inspired by Linear.app and Stripe.com
- Restrained color palette with dark theme
- Professional typography using Inter font
- Intentional spacing and visual hierarchy
- No generic AI-looking gradients or glowing effects

## Features (Stage 1)

- **Landing Page**: Clean interface to paste Google Sheet links
- **Template Selection**: Choose from 3 card templates (Profile, Product, Event)
- **Column Mapping**: Map spreadsheet columns to card fields
- **Cards Display**: Beautiful grid view with individual and batch export options

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── pages/
│   ├── Landing.jsx           # Landing page
│   ├── TemplateSelection.jsx  # Template & column mapping
│   └── CardsDisplay.jsx       # Cards grid view
├── App.jsx                    # Main app with routing
├── main.jsx                   # React entry point
└── index.css                  # Tailwind styles
```

## Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide Icons** - Icon library

## Next Steps (Future Stages)

- Real Google Sheets API integration
- PDF export functionality
- More template options
- Column preview and validation
- User authentication
- Data caching and history
