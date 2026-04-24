---
name: Landing page map design
description: Landing page uses Leaflet.js with CartoDB Dark Matter tiles on a full-screen #0d0d0d dark background. Dark/light toggle persists in localStorage as 'rozgar-theme'.
type: project
---

Landing page uses full-screen Leaflet map background with CartoDB Dark Matter tiles. Map is centered on New Delhi (28.6139, 77.209) zoom 12, all interactions disabled. Pulsing dot markers added via L.divIcon.

The ThemeToggle component lives at src/components/ThemeToggle.tsx and is added to every page's nav. Theme is stored in localStorage key 'rozgar-theme'. HTML default is 'dark' class. No-flash script in layout.tsx head.

**Why:** User wanted screenshot-matching dark map landing page with theme toggle.
**How to apply:** Landing page bg is always #0d0d0d (ignores theme). Other pages respect dark/light via Tailwind dark: variants.
