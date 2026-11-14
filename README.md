# Sky-style theme — Home page (v1)

यह एक original code है (किसी paid theme का code copy नहीं किया गया)। Look और functionality demo store जैसी बनाई गई है।

## Folder → Shopify theme में कहाँ जाता है
- `layout/theme.liquid`, `config/settings_schema.json`
- `assets/sky-base.css`, `assets/sky-base.js`
- `snippets/` (product card, back-to-top)
- `sections/` (हर section अलग file; `*-group.json` header/footer के groups)
- `templates/index.json` (home page का section order)

## Home page sections (ऊपर से नीचे)
1. sky-announcement-bar (top bar: menu + message + currency/language)
2. sky-header (transparent header, menu drawer, search, account, cart; scroll पर hide/show)
3. sky-hero-banner (banner + चलता हुआ "Spring Sale" text)
4. sky-collection-mosaic (Discover Signature Collections + video-inside-text "DROP")
5. sky-product-slider (Fresh picks — hover पर 2nd image + colour swatches)
6. sky-collection-panels (Shop Men / Shop Women — hover चips + 2nd model)
7. sky-showcase-pinned (Dress up… — scroll पर pinned, collections बदलते हैं)
8. sky-product-tabs (Premium / Fresh Picks / Trending — हर tab में अलग collection)
9. sky-shop-the-look (hotspots + product dock)
10. sky-featured-product (single product + discount strip)
11. sky-lookbook (Spring Summer 2026 — pinned, left images + right products scroll)
12. sky-countdown-bar (timer)
13. sky-floating-text (scroll पर words light up + images move)
14. sky-instagram-stack (cards पहले stack में; section पूरा दिखते ही अपने आप खुलकर row बनते हैं और लगातार slide होते हैं)
15. sky-brand-list (Shop By Brand)
16. sky-footer + sky-footer-bottom (newsletter, link columns, contact, currency/language, payment icons)
+ back-to-top button (scroll progress ring, hover पर arrow animation) और Lenis smooth scroll (`settings → Smooth scrolling`)

## Notes
- Fonts: Bricolage Grotesque (body), Quicksand (headings) — Google Fonts से load होते हैं।
- Smooth scroll के लिए open-source Lenis library CDN से load होती है।
- Product badge के लिए product tag `badge:Premium` जैसा लगाएँ।
- Instagram section में photos manually upload होती हैं (live Instagram feed के लिए बाद में कोई app/API जोड़ना होगा)।
- Countdown: end date format `YYYY-MM-DD HH:MM`.
