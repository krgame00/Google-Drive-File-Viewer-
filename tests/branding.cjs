const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const ico=fs.readFileSync(path.join(root,'favicon.svg'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');

// favicon file: drive triangle + play badge, valid standalone svg
assert(ico.includes('<svg xmlns="http://www.w3.org/2000/svg"'),'favicon is a standalone svg');
assert(ico.includes('viewBox="0 0 87.3 78"'),'favicon keeps the drive triangle geometry');
for(const c of ['#0066da','#00ac47','#ea4335','#00832d','#2684fc','#ffba00'])
  assert(ico.includes(c),'favicon keeps drive brand color '+c);
assert(ico.includes('<circle cx="43.65" cy="39" r="15.5" fill="#fff"/>'),'favicon has the play circle badge');
assert(ico.includes('M39 31.5 51.5 39 39 46.5Z'),'favicon has the play triangle');

// index.html: favicon linked with cache-busting version
assert(/rel="icon"[^>]*href="favicon\.svg\?v=\d{8}-r\d+"/.test(html),'index links the svg favicon with a version param');

// header: same play badge inline + GDFV wordmark with muted full name
assert(html.includes('<circle cx="43.65" cy="39" r="15.5" fill="#fff"/>'),'header logo carries the play badge');
assert(html.includes('<strong>GDFV</strong>'),'header shows the GDFV wordmark');
assert(html.includes('<span class="logo-full">Google Drive File Viewer</span>'),'full name kept as muted text');

// styles: wordmark styling + hidden on mobile
assert(css.includes('.logo-full { color: var(--muted)'),'logo-full is styled muted');
assert(/@media \(max-width: 600px\)[\s\S]*?\.logo-full \{ display: none; \}/.test(css),'logo-full is hidden on mobile');
console.log('PASS branding');
