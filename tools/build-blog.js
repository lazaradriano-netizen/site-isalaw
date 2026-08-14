// build-blog.js
// Reads every markdown post in content/posts-ro/ and content/posts-en/,
// and (re)generates resurse.html + one HTML page per article, in both languages.
// This is the script Netlify runs automatically every time a post is
// published, edited, or deleted through the /admin editor (or by hand).
//
// Run manually with:  node build-blog.js

const fs = require('fs');
const path = require('path');
const { parseFrontmatter, markdownToBlocks } = require('./parser.js');

const ROOT = path.resolve(__dirname, '..'); // site root (one level above /admin, /content, /tools)
const CONTENT_RO = path.join(ROOT, 'content', 'posts-ro');
const CONTENT_EN = path.join(ROOT, 'content', 'posts-en');
const TEMPLATES = __dirname;

function loadPosts(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const posts = files.map(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    return {
      title: data.title || '(fără titlu)',
      slug: data.slug || f.replace(/\.md$/, ''),
      excerpt: data.excerpt || '',
      date: data.date || '',
      lead: data.lead || null,
      blocks: markdownToBlocks(content),
    };
  });
  // newest first
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function renderSections(post) {
  const parts = [];
  if (post.lead) {
    parts.push(`<p class="article-lead">${post.lead}</p>`);
  }
  for (const b of post.blocks) {
    if (b.type === 'p') parts.push(`<p style="max-width:none;">${b.text}</p>`);
    else if (b.type === 'h3') parts.push(`<h3 style="margin-top:34px; margin-bottom:4px; color:var(--navy-900);">${b.text}</h3>`);
    else if (b.type === 'list') {
      const items = b.items.map(it => `<li>${it.lead ? `<strong>${it.lead}</strong> ` : ''}${it.text}</li>`).join('');
      parts.push(`<ol class="article-list">${items}</ol>`);
    }
  }
  return parts.join('\n        ');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildArticlePage(lang, post, headerTpl, footerTpl, hasTranslation) {
  const firm = lang === 'ro' ? 'Ilie, Stanciu & Asociații' : 'Ilie, Stanciu & Associates';
  const pageTitle = `${post.title} | ${firm}`;
  const home = lang === 'ro' ? 'Acasă' : 'Home';
  const resources = lang === 'ro' ? 'Resurse' : 'Resources';
  const ctaContact = lang === 'ro' ? 'Solicitați o consultanță' : 'Request a Consultation';
  const back = lang === 'ro' ? '← Înapoi la Resurse' : '← Back to Resources';

  let header = headerTpl;
  header = header.replace(/<title>.*?<\/title>/, `<title>${esc(pageTitle)}</title>`);
  header = header.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(post.excerpt)}$2`);
  header = header.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(pageTitle)}$2`);
  header = header.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(post.excerpt)}$2`);
  header = header.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(pageTitle)}$2`);
  header = header.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(post.excerpt)}$2`);

  // Apply all GENERIC nav/footer/asset path prefixing first, while btnRO/btnEN
  // still hold their template placeholder hrefs (so this can't accidentally
  // re-prefix them if one happens to equal "resurse.html" — see hasTranslation below).
  if (lang === 'en') {
    header = header
      .replace(/href="index\.html"/g, 'href="../index.html"')
      .replace(/href="despre-noi\.html"/g, 'href="../despre-noi.html"')
      .replace(/href="echipa\.html"/g, 'href="../echipa.html"')
      .replace(/href="arii-de-practica\.html"/g, 'href="../arii-de-practica.html"')
      .replace(/href="clienti-industrii\.html"/g, 'href="../clienti-industrii.html"')
      .replace(/href="abordarea-noastra\.html"/g, 'href="../abordarea-noastra.html"')
      .replace(/href="resurse\.html"/g, 'href="../resurse.html"')
      .replace(/href="contact\.html"/g, 'href="../contact.html"')
      .replace(/href="practice-/g, 'href="../practice-')
      .replace(/href="adrian-ilie\.html"/g, 'href="../adrian-ilie.html"')
      .replace(/href="victor-stanciu\.html"/g, 'href="../victor-stanciu.html"')
      .replace(/href="andrei-chiricuta\.html"/g, 'href="../andrei-chiricuta.html"')
      .replace(/href="roxana-bercaru\.html"/g, 'href="../roxana-bercaru.html"')
      .replace(/src="assets\//g, 'src="../assets/')
      .replace(/href="assets\//g, 'href="../assets/');
  }

  // Now apply the post-specific targeted replacements — these run LAST so
  // nothing after them can accidentally touch these exact hrefs again.
  const roHref = (lang === 'en' ? '../' : '') + post.slug + '.html';
  // If there's no translation for this post, send the language button to that
  // language's Resources listing instead of a page that doesn't exist.
  const enHref = hasTranslation
    ? (lang === 'en' ? '' : 'en/') + post.slug + '.html'
    : (lang === 'en' ? '' : 'en/') + 'resurse.html';
  header = header.replace(/<link rel="alternate" hreflang="ro" href="[^"]*">/, `<link rel="alternate" hreflang="ro" href="${roHref}">`);
  header = header.replace(/<link rel="alternate" hreflang="en" href="[^"]*">/, `<link rel="alternate" hreflang="en" href="${enHref}">`);
  if (lang === 'en') header = header.replace('<html lang="ro">', '<html lang="en">');
  header = header.replace('class="navlink active" href="echipa.html"', 'class="navlink" href="echipa.html"');
  const resourcesLabel = lang === 'ro' ? 'Resurse' : 'Resources';
  header = header.replace(`class="navlink" href="resurse.html">${resourcesLabel}<`, `class="navlink active" href="resurse.html">${resourcesLabel}<`);
  header = header.replace(/href="[^"]*"><button id="btnRO"/, `href="${roHref}"><button id="btnRO"`);
  header = header.replace(/href="[^"]*"><button id="btnEN"/, `href="${enHref}"><button id="btnEN"`);

  const homeHref = lang === 'en' ? '../index.html' : 'index.html';
  const blogHref = lang === 'en' ? '../resurse.html' : 'resurse.html';
  const contactHref = lang === 'en' ? '../contact.html' : 'contact.html';

  const body = `
  <section class="tight" style="padding-top:56px;">
    <div class="container" style="max-width:820px;">
      <div class="breadcrumb">
        <a href="${homeHref}" style="cursor:pointer; text-decoration:none; color:inherit;">${home}</a> /
        <a href="${blogHref}" style="cursor:pointer; text-decoration:none; color:inherit;">${resources}</a> /
        <span>${esc(post.title)}</span>
      </div>
      <h1 style="font-size:clamp(26px,3.4vw,40px); max-width:none;">${esc(post.title)}</h1>
      <div class="prose" style="margin-top:26px;">
        ${renderSections(post)}
      </div>
      <div class="hero-ctas" style="margin-top:40px;">
        <a href="${contactHref}"><button class="cta-btn">${ctaContact}</button></a>
        <a href="${blogHref}"><button class="cta-ghost">${back}</button></a>
      </div>
    </div>
  </section>`;

  let footer = footerTpl;
  if (lang === 'en') {
    footer = footer
      .replace(/href="index\.html"/g, 'href="../index.html"')
      .replace(/href="despre-noi\.html"/g, 'href="../despre-noi.html"')
      .replace(/href="echipa\.html"/g, 'href="../echipa.html"')
      .replace(/href="abordarea-noastra\.html"/g, 'href="../abordarea-noastra.html"')
      .replace(/href="practice-/g, 'href="../practice-')
      .replace(/href="contact\.html"/g, 'href="../contact.html"')
      .replace(/src="assets\//g, 'src="../assets/');
  }

  return header + body + '\n' + footer;
}

function buildListingPage(lang, posts, resurseTemplatePath) {
  let content = fs.readFileSync(resurseTemplatePath, 'utf-8');
  const readMore = lang === 'ro' ? 'Citește articolul →' : 'Read the article →';
  const cardsHtml = posts.map(p => `
        <div class="card" onclick="window.location.href='${p.slug}.html'" style="cursor:pointer;">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt)}</p>
          <span class="go">${readMore}</span>
        </div>`).join('');

  // Replace the block between the marker comments (see resurse.html) that wraps the card grid
  content = content.replace(/<!-- BLOG_CARDS_START -->[\s\S]*?<!-- BLOG_CARDS_END -->/, `<!-- BLOG_CARDS_START -->${cardsHtml}\n      <!-- BLOG_CARDS_END -->`);
  return content;
}

function main() {
  const postsRo = loadPosts(CONTENT_RO);
  const postsEn = loadPosts(CONTENT_EN);
  const roSlugs = new Set(postsRo.map(p => p.slug));
  const enSlugs = new Set(postsEn.map(p => p.slug));

  const headerRo = fs.readFileSync(path.join(TEMPLATES, 'ro_header.html'), 'utf-8');
  const footerRo = fs.readFileSync(path.join(TEMPLATES, 'ro_footer.html'), 'utf-8');
  const headerEn = fs.readFileSync(path.join(TEMPLATES, 'en_header.html'), 'utf-8');
  const footerEn = fs.readFileSync(path.join(TEMPLATES, 'en_footer.html'), 'utf-8');

  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'en'), { recursive: true });

  for (const p of postsRo) {
    const hasTranslation = enSlugs.has(p.slug);
    if (!hasTranslation) console.log(`  (notă: "${p.slug}" nu are încă o variantă în engleză — butonul EN va trimite la lista de Resurse)`);
    const html = buildArticlePage('ro', p, headerRo, footerRo, hasTranslation);
    fs.writeFileSync(path.join(ROOT, `${p.slug}.html`), html, 'utf-8');
    console.log('wrote', `${p.slug}.html`);
  }
  for (const p of postsEn) {
    const hasTranslation = roSlugs.has(p.slug);
    if (!hasTranslation) console.log(`  (note: "${p.slug}" has no Romanian version yet — the RO button will link to the Resources list)`);
    const html = buildArticlePage('en', p, headerEn, footerEn, hasTranslation);
    fs.writeFileSync(path.join(ROOT, 'en', `${p.slug}.html`), html, 'utf-8');
    console.log('wrote', `en/${p.slug}.html`);
  }

  const resurseRoOut = buildListingPage('ro', postsRo, path.join(ROOT, 'resurse.html'));
  fs.writeFileSync(path.join(ROOT, 'resurse.html'), resurseRoOut, 'utf-8');
  console.log('updated resurse.html with', postsRo.length, 'posts');

  const resurseEnOut = buildListingPage('en', postsEn, path.join(ROOT, 'en', 'resurse.html'));
  fs.writeFileSync(path.join(ROOT, 'en', 'resurse.html'), resurseEnOut, 'utf-8');
  console.log('updated en/resurse.html with', postsEn.length, 'posts');
}

main();
