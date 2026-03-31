const markdownIt = require('markdown-it')({ html: true, linkify: true, typographer: true });
const PDFDocument = require('pdfkit');

function mdToHtml(md, opts = {}) {
  const body = markdownIt.render(md);
  const css = opts.css || defaultCss();

  if (opts.standalone === false) return body;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function defaultCss() {
  return `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
h1, h2, h3, h4 { margin-top: 1.5em; }
code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 16px; color: #666; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f4f4f4; }
img { max-width: 100%; }
`;
}

// Simple markdown-to-PDF using pdfkit (no browser needed)
async function mdToPdf(md, opts = {}) {
  const html = markdownIt.render(md);
  return htmlToPdf(html, opts);
}

async function htmlToPdf(html, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: opts.format || 'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 }, // ~20mm in points
        info: { Title: 'Generated Document' },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Strip HTML tags and render as plain text with basic formatting
      const text = html
        .replace(/<h[1-6][^>]*>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<blockquote[^>]*>/gi, '\n> ')
        .replace(/<\/blockquote>/gi, '\n\n')
        .replace(/<strong>|<b>/gi, '')
        .replace(/<\/strong>|<\/b>/gi, '')
        .replace(/<em>|<i>/gi, '')
        .replace(/<\/em>|<\/i>/gi, '')
        .replace(/<code>/gi, '"')
        .replace(/<\/code>/gi, '"')
        .replace(/<[^>]+>/g, '') // strip remaining tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      doc.fontSize(11).text(text, { lineGap: 4 });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { mdToHtml, htmlToPdf, mdToPdf };
