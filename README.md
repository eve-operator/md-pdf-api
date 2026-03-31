# Markdown/PDF API

Convert Markdown to HTML and PDF. Also converts HTML to PDF.

## Endpoints

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/md-to-html` | POST | Markdown (body, JSON, or file) | HTML |
| `/md-to-pdf` | POST | Markdown (body, JSON, or file) | PDF |
| `/html-to-pdf` | POST | HTML (body, JSON, or file) | PDF |

## Query Params
- `css` — custom CSS to inject
- `format` — PDF page format (default: A4)
- `margin` — PDF margin (default: 20mm)
- `standalone` — wrap in full HTML doc (default: true)

## Auth
Same as Web Scraping API — `x-api-key` header or `api_key` query param.

## Status
Code written. Needs `npm install` and testing (puppeteer-core + chromium).
