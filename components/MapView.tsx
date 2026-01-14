
import React, { useEffect, useRef } from 'react';
import { Driver, Passenger, Location } from '../types';

interface MapViewProps {
  center: Location;
  drivers?: Driver[];
  passengers?: Passenger[];
  currentDriverId?: string;
  className?: string;
  onMapClick?: (loc: { lat: number, lng: number }) => void;
  selectedPickup?: Location | null;
  activeRoute?: [number, number][]; // Danh sách tọa độ để vẽ đường đi
}

declare const L: any;

const MapView: React.FC<MapViewProps> = ({ 
  center, 
  drivers = [], 
  passengers = [], 
  currentDriverId, 
  className,
  onMapClick,
  selectedPickup,
  activeRoute
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const selectionMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        maxZoom: 20,
        minZoom: 5,
        fadeAnimation: true
      }).setView([center.lat, center.lng], 16);

      const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y,m&hl=vi&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data ©2024 Google'
      });

      googleHybrid.addTo(mapRef.current);
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
      routeLayerRef.current = L.polyline([], {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
        dashArray: '1, 10' // Hiệu ứng nét đứt mặc định
      }).addTo(mapRef.current);

      if (onMapClick) {
        mapRef.current.on('click', (e: any) => {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Cập nhật đường đi (Route)
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current) return;
    
    if (activeRoute && activeRoute.length > 1) {
      routeLayerRef.current.setLatLngs(activeRoute);
      routeLayerRef.current.setStyle({ dashArray: null, color: '#3b82f6' }); // Nét liền khi có route thật
      
      const bounds = L.latLngBounds(activeRoute);
      mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true });
    } else {
      routeLayerRef.current.setLatLngs([]);
    }
  }, [activeRoute]);

  useEffect(() => {
    if (mapRef.current && (!activeRoute || activeRoute.length <= 1)) {
      mapRef.current.flyTo([center.lat, center.lng], 15, {
        animate: true,
        duration: 1.2
      });
    }
  }, [center.lat, center.lng, activeRoute]);

  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    drivers.forEach(driver => {
      const isMe = driver.id === currentDriverId;
      const marker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="p-2 rounded-full shadow-2xl ${isMe ? 'bg-blue-600 ring-4 ring-blue-500/30' : 'bg-white text-gray-800'} border-2 border-white transform transition-all hover:scale-125">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      });
      markersGroupRef.current.addLayer(marker);
    });

    passengers.forEach(p => {
      const isMyCustomer = p.driverId === currentDriverId && p.status === 'booked';
      const isPending = p.status === 'pending';
      
      if (p.status === 'completed') return; // Không vẽ khách đã xong

      const marker = L.marker([p.pickupLocation.lat, p.pickupLocation.lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="p-2 rounded-full shadow-lg ${isMyCustomer ? 'bg-green-600 ring-4 ring-green-100' : isPending ? 'bg-orange-500' : 'bg-gray-400'} text-white border-2 border-white transform transition-all hover:scale-125">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });
      
      // Popup thông tin
      marker.bindPopup(`
        <div class="p-2">
          <p class="font-black text-gray-900">${p.name}</p>
          <p class="text-[10px] text-gray-500 uppercase font-bold">${p.pickupTime}</p>
          <p class="text-xs text-blue-600 font-bold">${p.pickupLocation.name}</p>
        </div>
      `);
      
      markersGroupRef.current.addLayer(marker);
    });

    if (selectionMarkerRef.current) selectionMarkerRef.current.remove();
    if (selectedPickup) {
      selectionMarkerRef.current = L.marker([selectedPickup.lat, selectedPickup.lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="p-3 rounded-full shadow-2xl bg-white text-orange-600 ring-4 ring-orange-500/40 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
                </div>`,
          iconSize: [54, 54],
          iconAnchor: [27, 54]
        }),
        zIndexOffset: 1000
      }).addTo(mapRef.current);
    }
  }, [drivers, passengers, currentDriverId, selectedPickup]);

  return <div ref={containerRef} className={`${className} bg-[#0b1626] shadow-2xl`} />;
};

export default MapView;
