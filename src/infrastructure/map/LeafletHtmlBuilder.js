export function buildMapHTML({ points, isDark, userLat, userLng }) {
  const centerLat = userLat ?? 1.2136;
  const centerLng = userLng ?? -77.2811;
  const tileLayer = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;background:${isDark ? '#0F1F18' : '#EEF3F1'}}

  /* ── Pines de contenedor ── */
  .rpin-wrap{
    position:relative;
    display:flex;
    flex-direction:column;
    align-items:center;
  }
  .rpin{
    width:44px;height:44px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    border:3px solid rgba(255,255,255,0.9);
    box-shadow:0 4px 12px rgba(0,0,0,0.25),0 1px 3px rgba(0,0,0,0.15);
    font-size:20px;cursor:pointer;
    transition:transform 0.15s,box-shadow 0.15s;
    background:var(--pin-color);
  }
  .rpin-tail{
    width:4px;height:8px;
    background:var(--pin-color);
    border-radius:0 0 3px 3px;
    box-shadow:0 3px 4px rgba(0,0,0,0.18);
  }

  /* Pin seleccionado */
  .selected-pin .rpin{
    transform:scale(1.2);
    box-shadow:0 0 0 5px rgba(59,130,246,0.3),0 6px 20px rgba(0,0,0,0.35);
  }

  /* ── Pin de reporte ── */
  .report-pin-wrap{
    position:relative;
    display:flex;flex-direction:column;align-items:center;
  }
  .report-pin{
    width:40px;height:40px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    border:3px solid rgba(255,255,255,0.9);
    box-shadow:0 4px 12px rgba(0,0,0,0.25);
    font-size:16px;font-weight:900;color:#fff;
    cursor:pointer;transition:transform 0.15s;
    background:var(--pin-color);
  }
  .report-pin-tail{
    width:4px;height:8px;
    background:var(--pin-color);
    border-radius:0 0 3px 3px;
  }
  .selected-pin .report-pin{
    transform:scale(1.2);
    box-shadow:0 0 0 5px rgba(59,130,246,0.3),0 6px 20px rgba(0,0,0,0.35);
  }

  /* ── Pin de ubicación del usuario ── */
  .upin-outer{
    width:22px;height:22px;border-radius:50%;
    background:rgba(59,130,246,0.2);
    display:flex;align-items:center;justify-content:center;
    animation:pulse 2s infinite;
  }
  .upin{
    width:14px;height:14px;border-radius:50%;
    background:#3B82F6;border:2.5px solid #fff;
    box-shadow:0 2px 6px rgba(59,130,246,0.5);
  }
  @keyframes pulse{
    0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}
    70%{box-shadow:0 0 0 10px rgba(59,130,246,0)}
    100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}
  }

  /* ── Pin temporal (toque en mapa) ── */
  .tpin-wrap{display:flex;flex-direction:column;align-items:center}
  .tpin{
    width:38px;height:38px;border-radius:50%;
    background:#EF4444;
    border:3px solid #fff;
    box-shadow:0 4px 12px rgba(239,68,68,0.4);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  }
  .tpin-tail{width:4px;height:8px;background:#EF4444;border-radius:0 0 3px 3px}

  /* ── Controles de zoom ── */
  .leaflet-control-attribution{display:none}
  .leaflet-control-zoom{
    border:none!important;
    border-radius:14px!important;
    overflow:hidden;
    box-shadow:0 4px 14px rgba(0,0,0,0.15)!important;
  }
  .leaflet-control-zoom a{
    background:${isDark ? '#182820' : '#fff'}!important;
    color:${isDark ? '#E8F5EE' : '#1A2E23'}!important;
    border:none!important;
    border-bottom:1px solid ${isDark ? '#2A4035' : '#E2EDE6'}!important;
    width:40px!important;height:40px!important;
    line-height:40px!important;
    font-size:20px!important;
    display:flex!important;align-items:center!important;justify-content:center!important;
  }
  .leaflet-control-zoom-in{border-bottom:1px solid ${isDark ? '#2A4035' : '#E2EDE6'}!important}
  .leaflet-control-zoom-out{border-bottom:none!important}
  .leaflet-control-zoom a:hover{
    background:${isDark ? '#1E3228' : '#F4FAF6'}!important;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false}).setView([${centerLat},${centerLng}],15);
L.tileLayer('${tileLayer}',{maxZoom:19}).addTo(map);
L.control.zoom({position:'topright'}).addTo(map);

var pts=${JSON.stringify(points)};
var tempMarker=null;
var activeMarker=null;
var markersById={};

function setActiveMarker(marker){
  if(activeMarker && activeMarker!==marker){
    var prev=activeMarker.getElement();
    if(prev) prev.firstChild.classList.remove('selected-pin');
  }
  var el=marker.getElement();
  if(el) el.firstChild.classList.add('selected-pin');
  activeMarker=marker;
}

pts.forEach(function(p){
  var isReport = p.kind==='report';
  var safeColor = p.color || '#2E9E65';
  var iconHtml;

  if(isReport){
    iconHtml = '<div class="report-pin-wrap" style="--pin-color:'+safeColor+'">'
      + '<div class="report-pin">!</div>'
      + '<div class="report-pin-tail"></div>'
      + '</div>';
  } else {
    var emoji = (p.icon && p.icon!=='♻' && p.icon!=='!') ? p.icon : '♻';
    iconHtml = '<div class="rpin-wrap" style="--pin-color:'+safeColor+'">'
      + '<div class="rpin">'+emoji+'</div>'
      + '<div class="rpin-tail"></div>'
      + '</div>';
  }

  var icon=L.divIcon({
    className:'',
    html:iconHtml,
    iconSize:[44,52],
    iconAnchor:[22,52],
  });

  var m=L.marker([p.lat,p.lng],{icon:icon}).addTo(map);
  markersById[p.id]=m;

  m.on('click',function(e){
    L.DomEvent.stopPropagation(e);
    setActiveMarker(m);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'PIN_TAPPED',point:p}));
  });
});

${userLat && userLng ? `
  var uicon=L.divIcon({
    className:'',
    html:'<div class="upin-outer"><div class="upin"></div></div>',
    iconSize:[22,22],iconAnchor:[11,11]
  });
  L.marker([${userLat},${userLng}],{icon:uicon,zIndexOffset:1000}).addTo(map);
` : ''}

map.on('click',function(e){
  if(activeMarker){
    var ae=activeMarker.getElement();
    if(ae) ae.firstChild.classList.remove('selected-pin');
    activeMarker=null;
  }
  if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
  var ti=L.divIcon({
    className:'',
    html:'<div class="tpin-wrap"><div class="tpin">📍</div><div class="tpin-tail"></div></div>',
    iconSize:[38,46],iconAnchor:[19,46]
  });
  tempMarker=L.marker([e.latlng.lat,e.latlng.lng],{icon:ti}).addTo(map);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_TAPPED',lat:e.latlng.lat,lng:e.latlng.lng}));
});

function handleNativeMessage(e){
  try{
    var m=JSON.parse(e.data);
    if(m.type==='CENTER_USER'&&m.lat&&m.lng) map.flyTo([m.lat,m.lng],16,{duration:1.2});
    if(m.type==='FLY_TO_REPORT'&&m.id){
      var marker=markersById['report-'+m.id]||markersById[m.id];
      if(marker){
        map.flyTo(marker.getLatLng(),17,{duration:1.2});
        setActiveMarker(marker);
        var point=pts.find(function(p){ return p.id==='report-'+m.id || p.id===m.id; });
        if(point) window.ReactNativeWebView.postMessage(JSON.stringify({type:'PIN_TAPPED',point:point}));
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'FLY_TO_CONFIRMED',id:m.id}));
      } else if(Number.isFinite(Number(m.lat))&&Number.isFinite(Number(m.lng))){
        map.flyTo([Number(m.lat),Number(m.lng)],17,{duration:1.2});
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'FLY_TO_CONFIRMED',id:m.id}));
      }
    }
    if(m.type==='CLEAR_TEMP'){
      if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
      if(activeMarker){
        var element=activeMarker.getElement();
        if(element) element.firstChild.classList.remove('selected-pin');
        activeMarker=null;
      }
    }
  }catch(err){}
}

// React Native WebView dispatches postMessage differently depending on platform.
window.addEventListener('message',handleNativeMessage);
document.addEventListener('message',handleNativeMessage);
</script>
</body>
</html>`;
}
