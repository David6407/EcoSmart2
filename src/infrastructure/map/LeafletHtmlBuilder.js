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
  .rpin{width:40px;height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.3);font-size:18px;cursor:pointer;transition:transform 0.1s}
  .rpin:active{transform:scale(0.9)}
  .selected-pin{transform:scale(1.18);box-shadow:0 0 0 5px rgba(25,118,210,0.24),0 4px 18px rgba(0,0,0,0.34)}
  .upin{width:16px;height:16px;border-radius:8px;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 8px rgba(59,130,246,0.2)}
  .tpin{width:36px;height:36px;border-radius:18px;background:#EF4444;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:17px}
  .leaflet-control-attribution{display:none}
  .leaflet-control-zoom{border:none!important}
  .leaflet-control-zoom a{background:${isDark ? '#182820' : '#fff'}!important;color:${isDark ? '#E8F5EE' : '#1A2E23'}!important;border:1px solid ${isDark ? '#2A4035' : '#E2EDE6'}!important;border-radius:10px!important;margin-bottom:4px!important}
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
    var previous=activeMarker.getElement();
    if(previous) previous.firstChild.classList.remove('selected-pin');
  }
  var element=marker.getElement();
  if(element) element.firstChild.classList.add('selected-pin');
  activeMarker=marker;
}

pts.forEach(function(p){
  var icon=L.divIcon({
    className:'',
    html:'<div class="rpin" style="background:'+p.color+'">'+(p.icon||'R')+'</div>',
    iconSize:[40,40],
    iconAnchor:[20,20],
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
  var uicon=L.divIcon({className:'',html:'<div class="upin"></div>',iconSize:[16,16],iconAnchor:[8,8]});
  L.marker([${userLat},${userLng}],{icon:uicon,zIndexOffset:1000}).addTo(map);
` : ''}

map.on('click',function(e){
  if(activeMarker){
    var activeElement=activeMarker.getElement();
    if(activeElement) activeElement.firstChild.classList.remove('selected-pin');
    activeMarker=null;
  }
  if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
  var ti=L.divIcon({className:'',html:'<div class="tpin">!</div>',iconSize:[36,36],iconAnchor:[18,36]});
  tempMarker=L.marker([e.latlng.lat,e.latlng.lng],{icon:ti}).addTo(map);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_TAPPED',lat:e.latlng.lat,lng:e.latlng.lng}));
});

document.addEventListener('message',function(e){
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
});
</script>
</body>
</html>`;
}
