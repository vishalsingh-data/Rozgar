'use client';

import { useEffect } from 'react';

export default function MapBackground() {
  useEffect(() => {
    // Dynamically load Leaflet only in browser
    let map: any = null;

    async function initMap() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const container = document.getElementById('map-bg');
      if (!container || (container as any)._leaflet_id) return;

      map = L.map('map-bg', {
        center: [28.6139, 77.209],
        zoom: 12,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      // Add pulsing location dots
      const dots = [
        [28.6448, 77.2167], // Civil Lines
        [28.5355, 77.391],  // Noida
        [28.4595, 77.0266], // Gurgaon
        [28.7041, 77.1025], // Rohini
        [28.6304, 77.2177], // Connaught Place
        [28.5672, 77.321],  // Lajpat Nagar
        [28.6898, 77.1507], // Pitampura
        [28.5245, 77.1855], // Dwarka
      ];

      dots.forEach(([lat, lng], i) => {
        const colors = ['#6efa96', '#40C057', '#a8f5c0', '#6efa96', '#2f9e44'];
        const color = colors[i % colors.length];
        const size = i === 0 ? 14 : i % 2 === 0 ? 10 : 8;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:${size}px;height:${size}px;">
              <div style="
                position:absolute;inset:0;
                border-radius:50%;
                background:${color};
                opacity:0.9;
                box-shadow:0 0 ${size * 2}px ${color};
              "></div>
              <div style="
                position:absolute;inset:-${size * 0.8}px;
                border-radius:50%;
                border:1.5px solid ${color};
                opacity:0.4;
                animation:leaflet-ping 2s ease-out infinite;
                animation-delay:${i * 0.3}s;
              "></div>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        L.marker([lat, lng], { icon }).addTo(map);
      });
    }

    // Inject animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes leaflet-ping {
        0% { transform: scale(0.8); opacity: 0.6; }
        100% { transform: scale(3); opacity: 0; }
      }
      .leaflet-container { background: #0d0d0d !important; }
    `;
    document.head.appendChild(style);

    initMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  return (
    <div
      id="map-bg"
      className="absolute inset-0 z-0"
      style={{ background: '#0d0d0d' }}
    />
  );
}
