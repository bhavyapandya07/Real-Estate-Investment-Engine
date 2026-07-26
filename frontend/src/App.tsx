import { useState, useEffect, useRef } from 'react';
import { Layers, FileText, Info } from 'lucide-react';

// ⚠️ REPLACE THIS WITH YOUR ACTUAL RENDER URL! (Make sure there is NO trailing slash at the end)
const API_BASE_URL = "https://your-app-name.onrender.com";

// --- Types & Configs ---
interface Distances {
  [key: string]: number;
}
interface ScoreData {
  final_score: number;
  distances_in_meters: Distances;
  nearest_points: Record<string, [number, number]>;
}
interface Insights {
  pros: string[];
  cons: string[];
}

type LayerKey = 'building' | 'clinic' | 'college' | 'firestation' | 'highway' | 'hospital' | 'mall' | 'office' | 'park' | 'policstation' | 'restaurant' | 'school' | 'water';

const LAYER_CONFIGS: Record<LayerKey, { label: string, description: string, color: string, fill: string }> = {
  building: { label: 'Buildings', description: 'General footprints', color: '#94a3b8', fill: '#cbd5e1' },
  clinic: { label: 'Clinics', description: 'Local healthcare', color: '#fb7185', fill: '#fda4af' },
  college: { label: 'Colleges', description: 'Higher education', color: '#9333ea', fill: '#a855f7' },
  firestation: { label: 'Fire Stations', description: 'Emergency response', color: '#991b1b', fill: '#b91c1c' },
  highway: { label: 'Highways', description: 'Major roads', color: '#334155', fill: '#64748b' },
  hospital: { label: 'Hospitals', description: 'Medical centers', color: '#dc2626', fill: '#ef4444' },
  mall: { label: 'Malls', description: 'Retail shopping', color: '#eab308', fill: '#facc15' },
  office: { label: 'Offices', description: 'Commercial spaces', color: '#38bdf8', fill: '#7dd3fc' },
  park: { label: 'Parks', description: 'Green spaces', color: '#4ade80', fill: '#86efac' },
  policstation: { label: 'Police Stations', description: 'Law enforcement', color: '#1d4ed8', fill: '#2563eb' },
  restaurant: { label: 'Restaurants', description: 'Dining eateries', color: '#fde047', fill: '#fef08a' },
  school: { label: 'Schools', description: 'Primary education', color: '#c084fc', fill: '#d8b4fe' },
  water: { label: 'Water Bodies', description: 'Rivers and lakes', color: '#0284c7', fill: '#38bdf8' }
};

const worldBounds = [[-90, -180], [90, -180], [90, 180], [-90, 180]] as [number, number][];
const kalyanHole = [
  [19.181813, 73.054790],
  [19.247949, 73.054790],
  [19.247949, 73.128433],
  [19.181813, 73.128433],
  [19.181813, 73.054790]
] as [number, number][];

export default function App() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [roadDistances, setRoadDistances] = useState<Record<string, number>>({});

  const initialLayerState = Object.keys(LAYER_CONFIGS).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<LayerKey, boolean>);
  const initialGeoDataState = Object.keys(LAYER_CONFIGS).reduce((acc, key) => ({ ...acc, [key]: null }), {} as Record<LayerKey, any>);

  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>(initialLayerState);
  const [geoData, setGeoData] = useState<Record<LayerKey, any>>(initialGeoDataState);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layersRef = useRef<Record<LayerKey | 'marker', any>>({ ...initialGeoDataState, marker: null });
  const routesRef = useRef<Record<LayerKey, any>>(initialGeoDataState);

  const generateInsights = (distances: Distances) => {
    const pros: string[] = [];
    const cons: string[] = [];

    const highway = distances.highway || 99999;
    if (highway <= 2000) pros.push(`Excellent connectivity: The nearest highway is just ${highway}m away.`);
    else cons.push(`Poor connectivity: The nearest highway is quite far (${(highway / 1000).toFixed(1)}km).`);

    const hospital = distances.hospital || 99999;
    if (hospital <= 1500) pros.push(`Good healthcare access: Nearest hospital is ${hospital}m away.`);
    else cons.push(`Healthcare is distant: You'll need to travel ${(hospital / 1000).toFixed(1)}km to a hospital.`);

    const school = distances.school || 99999;
    if (school <= 1200) pros.push(`Great for families: Schools are within easy reach (${school}m).`);

    const water = distances.water || 99999;
    if (water <= 150) cons.push(`Potential flood risk: A water body is very close (${water}m).`);
    else pros.push(`Low flood risk: No immediate dangerous proximity to water bodies.`);

    setInsights({ pros: pros.slice(0, 3), cons: cons.slice(0, 3) });
  };

  useEffect(() => {
    if (!document.getElementById('routing-styles')) {
      const style = document.createElement('style');
      style.id = 'routing-styles';
      style.innerHTML = `
        @keyframes flowAnimation {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-route-line {
          animation: flowAnimation 1s linear infinite;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-script')) {
      const script = document.createElement('script');
      script.id = 'leaflet-script';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      const checkL = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkL);
          initMap();
        }
      }, 100);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;
    const L = (window as any).L;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([19.2148, 73.0916], 13);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.polygon([worldBounds, kalyanHole], {
      color: 'transparent',
      fillColor: '#0f172a',
      fillOpacity: 0.6
    }).addTo(map);

    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;

      if (lat < 19.1818 || lat > 19.2480 || lng < 73.0547 || lng > 73.1285) return;

      if (layersRef.current.marker) map.removeLayer(layersRef.current.marker);

      (Object.keys(routesRef.current) as LayerKey[]).forEach(key => {
        if (routesRef.current[key]) {
          map.removeLayer(routesRef.current[key]);
          routesRef.current[key] = null;
        }
      });
      setRoadDistances({});
      setScoreData(null);
      setInsights(null);

      layersRef.current.marker = L.circleMarker([lat, lng], {
        radius: 8, color: '#ffffff', weight: 2, fillColor: '#2383e2', fillOpacity: 1
      }).addTo(map);

      setPosition([lat, lng]);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE_URL}/api/calculate-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: lat, lng: lng })
        });

        const responseJson = await res.json();

        if (responseJson.status === "success") {
          const data: ScoreData = responseJson.data;
          setScoreData(data);
          generateInsights(data.distances_in_meters);
        }
      } catch (error) {
        console.warn("Backend not detected.", error);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (!mapInstance.current) return;
    const L = (window as any).L;

    (Object.keys(LAYER_CONFIGS) as LayerKey[]).forEach((layerKey) => {
      const config = LAYER_CONFIGS[layerKey];

      if (activeLayers[layerKey] && geoData[layerKey] && !layersRef.current[layerKey]) {
        layersRef.current[layerKey] = L.geoJSON(geoData[layerKey], {
          style: { color: config.color, weight: 2, fillColor: config.fill, fillOpacity: 0.4 },
          pointToLayer: (_: any, latlng: any) => L.circleMarker(latlng, {
            radius: 6, color: config.color, weight: 2, fillColor: config.fill, fillOpacity: 0.8
          }),
          onEachFeature: (feature: any, layer: any) => {
            const props = feature.properties || {};
            const name = props.name || props['name:en'] || `A ${config.label} Location`;
            const detailType = props.amenity || props.leisure || props.shop || props.highway || config.label;

            const popupHtml = `
              <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; margin: 0; min-width: 140px; padding: 4px;">
                <strong style="display: block; font-size: 14px; color: #37352f; margin-bottom: 4px; font-weight: 600;">${name}</strong>
                <span style="display: inline-block; font-size: 12px; color: rgba(55, 53, 47, 0.65); text-transform: capitalize;">
                  ${String(detailType).replace(/_/g, ' ')}
                </span>
              </div>
            `;
            layer.bindPopup(popupHtml, { closeButton: false, offset: L.point(0, -2) });
          }
        }).addTo(mapInstance.current);
      } else if (!activeLayers[layerKey] && layersRef.current[layerKey]) {
        mapInstance.current.removeLayer(layersRef.current[layerKey]);
        layersRef.current[layerKey] = null;
      }

      if (activeLayers[layerKey] && scoreData && position && !routesRef.current[layerKey]) {
        const targetCoord = scoreData.nearest_points[layerKey];
        if (targetCoord) {
          const startLng = position[1];
          const startLat = position[0];
          const endLng = targetCoord[1];
          const endLat = targetCoord[0];

          fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes.length > 0 && !routesRef.current[layerKey]) {
                const route = data.routes[0];

                setRoadDistances(prev => ({ ...prev, [layerKey]: Math.round(route.distance) }));

                routesRef.current[layerKey] = L.geoJSON(route.geometry, {
                  style: {
                    color: config.color,
                    weight: 4,
                    opacity: 0.9,
                    dashArray: '12, 12',
                    className: 'animated-route-line'
                  }
                }).addTo(mapInstance.current);
              }
            })
            .catch(err => console.error("OSRM Routing failed:", err));
        }
      } else if (!activeLayers[layerKey] && routesRef.current[layerKey]) {
        mapInstance.current.removeLayer(routesRef.current[layerKey]);
        routesRef.current[layerKey] = null;
      }

    });
  }, [activeLayers, geoData, scoreData, position]);

  const toggleLayer = async (layer: LayerKey) => {
    const isActivating = !activeLayers[layer];
    setActiveLayers(prev => ({ ...prev, [layer]: isActivating }));

    if (isActivating && !geoData[layer]) {
      try {
        const res = await fetch(`${API_BASE_URL}/data/${layer}.geojson`);
        if (!res.ok) throw new Error("File not found");
        const data = await res.json();
        setGeoData(prev => ({ ...prev, [layer]: data }));
      } catch (err) {
        console.warn(`Failed to fetch ${layer}.geojson.`, err);
      }
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden text-[#37352f] bg-[#f7f6f3]"
      style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"' }}
    >
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* --- Left Panel: Results & Insights (Notion Style) --- */}
      <div className="absolute top-4 left-4 z-[1000] w-[380px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-lg shadow-[rgba(15,15,15,0.05)_0px_0px_0px_1px,rgba(15,15,15,0.1)_0px_3px_6px,rgba(15,15,15,0.2)_0px_9px_24px] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 shrink-0 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#37352f]" />
          <h1 className="text-[15px] font-semibold tracking-tight text-[#37352f]">
            Land Investment Analysis
          </h1>
        </div>

        {/* Dynamic Content */}
        <div className="px-5 pb-5 flex flex-col gap-4 shrink-0">

          {!scoreData && !loading && (
            <div className="flex items-start gap-3 p-3 rounded bg-[#f7f6f3] border border-[rgba(55,53,47,0.09)]">
              <Info className="w-4 h-4 text-[#eb5757] mt-0.5 shrink-0" />
              <p className="text-[14px] text-[#37352f]">
                Click anywhere inside the highlighted map area to generate a spatial analysis report.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-6 text-center flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#e9e9e7] border-t-[#37352f] rounded-full animate-spin"></div>
              <p className="text-[13px] text-[rgba(55,53,47,0.65)]">Processing spatial vectors...</p>
            </div>
          )}

          {scoreData && insights && !loading && (
            <>
              {/* Score Display */}
              <div className="flex flex-col gap-1">
                <p className="text-[12px] font-semibold text-[rgba(55,53,47,0.65)] uppercase tracking-wider">Investment Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#37352f] tracking-tight">
                    {scoreData.final_score}
                  </span>
                  <span className="text-[15px] font-medium text-[rgba(55,53,47,0.4)]">/ 100</span>
                </div>
              </div>

              <hr className="border-[rgba(55,53,47,0.09)] my-1" />

              {/* Notion Callouts for Pros/Cons */}
              <div className="flex flex-col gap-3">
                {insights.pros.map((pro, i) => (
                  <div key={`pro-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-[#f7f6f3] border border-[rgba(55,53,47,0.09)]">
                    <span className="text-base leading-none">💡</span>
                    <p className="text-[14px] text-[#37352f] leading-snug">{pro}</p>
                  </div>
                ))}

                {insights.cons.map((con, i) => (
                  <div key={`con-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-[#fdf5eb] border border-[rgba(55,53,47,0.09)]">
                    <span className="text-base leading-none">⚠️</span>
                    <p className="text-[14px] text-[#37352f] leading-snug">{con}</p>
                  </div>
                ))}
              </div>

              {/* Distance Properties (Notion Database Layout) */}
              <div className="mt-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[rgba(55,53,47,0.65)] uppercase tracking-wider">Distance by Roadway</p>
                  <p className="text-[10px] text-[#2383e2]">OSRM Routing Active</p>
                </div>

                <div className="flex flex-col border border-[rgba(55,53,47,0.09)] rounded-md overflow-hidden">
                  {Object.entries(scoreData.distances_in_meters).map(([key, val], index) => {
                    const label = LAYER_CONFIGS[key as LayerKey]?.label || key;
                    const isLayerActive = activeLayers[key as LayerKey];

                    // Use real OSRM road distance if layer is toggled ON, otherwise use backend straight-line fallback
                    const displayDistance = (isLayerActive && roadDistances[key])
                      ? roadDistances[key]
                      : val;

                    return (
                      <div key={key} className={`flex items-center px-3 py-2 text-[14px] ${index !== 0 ? 'border-t border-[rgba(55,53,47,0.09)]' : ''} hover:bg-[rgba(55,53,47,0.04)] transition-colors`}>
                        <div className="w-[140px] text-[rgba(55,53,47,0.65)] flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" /> {label}
                        </div>
                        <div className="text-[#37352f] flex-1">
                          {displayDistance} m
                          {isLayerActive && roadDistances[key] && <span className="ml-2 text-[11px] text-[#2383e2] bg-[#2383e2]/10 px-1.5 py-0.5 rounded">Via Road</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Right Panel: Layer Toggles (Notion Style) --- */}
      <div className="absolute top-4 right-4 z-[1000] w-[300px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-lg shadow-[rgba(15,15,15,0.05)_0px_0px_0px_1px,rgba(15,15,15,0.1)_0px_3px_6px,rgba(15,15,15,0.2)_0px_9px_24px] flex flex-col">

        <div className="px-4 py-3 border-b border-[rgba(55,53,47,0.09)] sticky top-0 z-10 bg-white">
          <h2 className="text-[14px] font-semibold text-[#37352f]">Vector Layers</h2>
          <p className="text-[12px] text-[rgba(55,53,47,0.65)] mt-0.5">Toggle to calculate road path</p>
        </div>

        <div className="flex flex-col py-2">
          {(Object.keys(LAYER_CONFIGS) as LayerKey[]).map((key) => {
            const config = LAYER_CONFIGS[key];
            const isActive = activeLayers[key];
            return (
              <div
                key={key}
                onClick={() => toggleLayer(key)}
                className="flex items-center justify-between px-4 py-2 hover:bg-[rgba(55,53,47,0.08)] transition-colors cursor-pointer"
              >
                <div className="flex flex-col">
                  <p className="text-[14px] text-[#37352f] flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></span>
                    {config.label}
                  </p>
                  <p className="text-[12px] text-[rgba(55,53,47,0.5)] pl-4">{config.description}</p>
                </div>

                {/* Notion Style Toggle */}
                <div className="flex items-center shrink-0">
                  <div
                    className={`relative inline-flex h-[18px] w-[32px] items-center rounded-full transition-colors duration-200 ease-in-out ${isActive ? 'bg-[#2383e2]' : 'bg-[rgba(55,53,47,0.16)]'}`}
                  >
                    <span className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${isActive ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}