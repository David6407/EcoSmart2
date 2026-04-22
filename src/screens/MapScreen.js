import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

// ─────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────
const MATERIAL_TYPES = ['Plástico', 'Papel', 'Vidrio', 'Orgánico', 'Metal', 'Electrónico'];
const FILTERS        = ['Todos', 'Plastico', 'Vidrio', 'Organico'];

const MATERIAL_ICONS = {
  Plastico:   '🥤',
  Vidrio:     '🍾',
  Organico:   '🌿',
  Papel:      '📰',
  Metal:      '🔧',
  Electronico:'💻',
};

// Leyenda de colores de pines
const LEGEND = [
  { color: '#2E9E65', label: 'Activo',       status: 'activo'       },
  { color: '#FBC02D', label: 'Mantenimiento', status: 'mantenimiento'},
  { color: '#EF5350', label: 'Inactivo',      status: 'inactivo'     },
];

// Fallback si Supabase no está configurado
const FALLBACK_POINTS = [
  { id: 'p1', lat: 1.2136, lng: -77.2811, title: 'Punto Verde Centro',   type: 'Plastico',  materials: ['Plastico','Papel'],  color: '#2E9E65', status: 'activo'        },
  { id: 'p2', lat: 1.2180, lng: -77.2750, title: 'Reciclaje La Aurora',  type: 'Vidrio',    materials: ['Vidrio','Metal'],    color: '#FBC02D', status: 'mantenimiento' },
  { id: 'p3', lat: 1.2090, lng: -77.2900, title: 'Ecopunto Sur',         type: 'Organico',  materials: ['Organico','Papel'],  color: '#2E9E65', status: 'activo'        },
  { id: 'p4', lat: 1.2200, lng: -77.2870, title: 'Punto Plástico Norte', type: 'Plastico',  materials: ['Plastico'],          color: '#FBC02D', status: 'mantenimiento' },
];

// ─────────────────────────────────────────────────────────────────
// HTML del mapa Leaflet
// ─────────────────────────────────────────────────────────────────
function buildMapHTML({ points, isDark, userLat, userLng }) {
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

pts.forEach(function(p){
  var icon=L.divIcon({
    className:'',
    html:'<div class="rpin" style="background:'+p.color+'">♻</div>',
    iconSize:[40,40],
    iconAnchor:[20,20],
  });
  var m=L.marker([p.lat,p.lng],{icon:icon}).addTo(map);
  m.on('click',function(e){
    L.DomEvent.stopPropagation(e);
    // Resaltar pin seleccionado
    if(activeMarker && activeMarker!==m){
      activeMarker.getElement().style.opacity='1';
    }
    m.getElement().style.opacity='0.8';
    activeMarker=m;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'PIN_TAPPED',point:p}));
  });
});

${userLat && userLng ? `
  var uicon=L.divIcon({className:'',html:'<div class="upin"></div>',iconSize:[16,16],iconAnchor:[8,8]});
  L.marker([${userLat},${userLng}],{icon:uicon,zIndexOffset:1000}).addTo(map);
` : ''}

map.on('click',function(e){
  // Limpiar selección activa
  if(activeMarker){activeMarker.getElement().style.opacity='1';activeMarker=null;}
  if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
  var ti=L.divIcon({className:'',html:'<div class="tpin">📍</div>',iconSize:[36,36],iconAnchor:[18,36]});
  tempMarker=L.marker([e.latlng.lat,e.latlng.lng],{icon:ti}).addTo(map);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_TAPPED',lat:e.latlng.lat,lng:e.latlng.lng}));
});

document.addEventListener('message',function(e){
  try{
    var m=JSON.parse(e.data);
    if(m.type==='CENTER_USER'&&m.lat&&m.lng) map.flyTo([m.lat,m.lng],16,{duration:1.2});
    if(m.type==='CLEAR_TEMP'){
      if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}
      if(activeMarker){activeMarker.getElement().style.opacity='1';activeMarker=null;}
    }
  }catch(err){}
});
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────
// BottomSheet — Modal que escapa del overflow:hidden del phoneShell
// ─────────────────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: info de punto (desde Supabase)
// ─────────────────────────────────────────────────────────────────
function PointInfoPanel({ point, onClose, onReport, isDark, colors }) {
  const { card, border, text, textMuted, accent, accentSoft } = colors;

  // Estado del punto → color y etiqueta
  const statusMap = {
    activo:        { label: '● Activo',         color: accent },
    mantenimiento: { label: '⚠ Mantenimiento',  color: '#D4A017' },
    inactivo:      { label: '✕ Inactivo',        color: colors.error },
  };
  const statusInfo = statusMap[point.status] || statusMap.activo;

  // Materiales como array
  const materials = Array.isArray(point.materials)
    ? point.materials
    : [point.type].filter(Boolean);

  return (
    <View style={{
      backgroundColor: card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 20, gap: 16,
      borderWidth: 1, borderBottomWidth: 0, borderColor: border,
    }}>
      {/* Handle */}
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border, alignSelf: 'center', marginTop: -4 }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#1E3228' : '#F4FAF6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: statusInfo.color, fontSize: 11, fontWeight: '800' }}>
              {statusInfo.label}
            </Text>
          </View>
          <Text style={{ color: text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
            {point.title}
          </Text>
          <Text style={{ color: textMuted, fontSize: 13 }}>
            Punto de reciclaje verificado
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1E3228' : '#EEF3F1', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: textMuted, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      {/* Materiales aceptados */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Materiales aceptados
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {materials.map((mat) => (
            <View key={mat} style={{
              backgroundColor: accentSoft, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 7,
              borderWidth: 1, borderColor: border,
            }}>
              <Text style={{ color: isDark ? '#5AD492' : '#2E7A50', fontSize: 12, fontWeight: '700' }}>
                {MATERIAL_ICONS[mat] || '♻️'} {mat}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Botón reportar — deshabilitado si está inactivo */}
      <Pressable
        onPress={() => onReport(point.lat, point.lng, point.title)}
        disabled={point.status === 'inactivo'}
        style={({ pressed }) => ({
          backgroundColor: point.status === 'inactivo'
            ? (isDark ? '#1E2820' : '#EEF3F1')
            : accent,
          borderRadius: 16, paddingVertical: 15,
          alignItems: 'center', opacity: pressed ? 0.85 : 1,
          shadowColor: isDark ? '#2E9E65' : '#1B6B40',
          shadowOpacity: point.status === 'inactivo' ? 0 : 0.3,
          shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
        })}
      >
        <Text style={{
          fontSize: 15, fontWeight: '800', letterSpacing: 0.3,
          color: point.status === 'inactivo' ? textMuted : '#FFF',
        }}>
          {point.status === 'inactivo' ? 'Punto no disponible' : 'Reportar visita →'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: formulario de reporte
// ─────────────────────────────────────────────────────────────────
function ReportPanel({ lat, lng, prefillTitle, onClose, onSuccess, isDark, colors, currentUser }) {
  const { card, border, text, textMuted, accent, accentSoft, inputBg, error: errorColor } = colors;
  const [title, setTitle]                       = useState(prefillTitle || '');
  const [description, setDescription]           = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [formError, setFormError]               = useState('');

  function toggleMaterial(mat) {
    setSelectedMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  }

  async function handleSubmit() {
    if (!title.trim()) { setFormError('Agrega un título al reporte.'); return; }
    if (!isSupabaseConfigured || !supabase) { setFormError('Supabase no está configurado.'); return; }

    setIsSubmitting(true);
    setFormError('');

    const fullDescription = [
      description.trim(),
      selectedMaterials.length > 0 ? `Materiales: ${selectedMaterials.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const { error: dbError } = await supabase.from('reports').insert({
      user_id:       currentUser?.id,
      title:         title.trim(),
      description:   fullDescription || null,
      latitude:      lat,
      longitude:     lng,
      status:        'pendiente',
      points_awarded: 10,
    });

    setIsSubmitting(false);
    if (dbError) { setFormError(dbError.message); return; }
    onSuccess();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{
        backgroundColor: card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderBottomWidth: 0, borderColor: border,
        maxHeight: '92%',
      }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 14 }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border, alignSelf: 'center', marginTop: -4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: text, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>
                Nuevo reporte
              </Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                Suma +10 puntos a tu perfil
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1E3228' : '#EEF3F1', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: textMuted, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>

          {/* Coords */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: accent }} />
            <Text style={{ color: textMuted, fontSize: 12 }}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </View>

          {/* Título */}
          <View style={{ gap: 7 }}>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Título *
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: inputBg, borderRadius: 14,
              borderWidth: 1.5, borderColor: title.trim() ? accent : border,
              paddingHorizontal: 14,
            }}>
              <TextInput
                value={title}
                onChangeText={(v) => { setTitle(v); setFormError(''); }}
                placeholder="Ej: Punto sin mantenimiento"
                placeholderTextColor={isDark ? '#4A6858' : '#9EB0A4'}
                style={{ flex: 1, paddingVertical: 12, color: text, fontSize: 14 }}
              />
            </View>
          </View>

          {/* Materiales */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Materiales presentes
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MATERIAL_TYPES.map((mat) => {
                const sel = selectedMaterials.includes(mat);
                return (
                  <Pressable
                    key={mat}
                    onPress={() => toggleMaterial(mat)}
                    style={{
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: sel ? accent : (isDark ? '#1A3828' : '#EAF4ED'),
                      borderWidth: 1.5, borderColor: sel ? accent : border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? '#FFF' : (isDark ? '#5AD492' : '#2E7A50') }}>
                      {mat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Descripción */}
          <View style={{ gap: 7 }}>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Descripción (opcional)
            </Text>
            <View style={{ backgroundColor: inputBg, borderRadius: 14, borderWidth: 1.5, borderColor: border, paddingHorizontal: 14 }}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe el estado del punto..."
                placeholderTextColor={isDark ? '#4A6858' : '#9EB0A4'}
                multiline
                numberOfLines={3}
                style={{ paddingVertical: 12, color: text, fontSize: 14, minHeight: 70, textAlignVertical: 'top' }}
              />
            </View>
          </View>

          {/* Error */}
          {formError ? (
            <View style={{ backgroundColor: isDark ? '#2A1215' : '#FFF0F2', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: errorColor }}>
              <Text style={{ color: errorColor, fontSize: 12, fontWeight: '600' }}>⚠ {formError}</Text>
            </View>
          ) : null}

          {/* Botón enviar */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => ({
              backgroundColor: accent, borderRadius: 16, paddingVertical: 15,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              opacity: isSubmitting || pressed ? 0.75 : 1,
              shadowColor: isDark ? '#2E9E65' : '#1B6B40',
              shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
              marginBottom: Platform.OS === 'android' ? 8 : 0,
            })}
          >
            {isSubmitting && <ActivityIndicator size="small" color="#FFF" />}
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>
              {isSubmitting ? 'Enviando...' : 'Enviar reporte →'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: éxito con puntos ganados
// ─────────────────────────────────────────────────────────────────
function SuccessPanel({ onClose, isDark, colors }) {
  const { card, border, text, textMuted, accent, accentSoft } = colors;
  return (
    <View style={{
      backgroundColor: card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 32, alignItems: 'center', gap: 14,
      borderWidth: 1, borderBottomWidth: 0, borderColor: border,
    }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 38 }}>✅</Text>
      </View>

      <Text style={{ color: text, fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 }}>
        ¡Reporte enviado!
      </Text>

      {/* Badge de puntos ganados */}
      <View style={{ backgroundColor: accentSoft, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20 }}>⭐</Text>
        <Text style={{ color: accent, fontSize: 18, fontWeight: '900' }}>+10 puntos</Text>
      </View>

      <Text style={{ color: textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
        Tu reporte quedó registrado como{' '}
        <Text style={{ fontWeight: '800', color: accent }}>pendiente</Text>.{'\n'}
        Ganarás +5 puntos extra cuando sea validado.
      </Text>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => ({
          backgroundColor: accent, borderRadius: 16,
          paddingVertical: 14, paddingHorizontal: 48,
          opacity: pressed ? 0.85 : 1, marginTop: 4,
          shadowColor: isDark ? '#2E9E65' : '#1B6B40',
          shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
          marginBottom: 8,
        })}
      >
        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Listo</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────────
export function MapScreen({ currentUser, onReportSuccess }) {
  const isDark     = useColorScheme() === 'dark';
  const t          = getTheme(isDark);
  const webviewRef = useRef(null);

  const colors = {
    card:       isDark ? '#182820' : '#FFFFFF',
    border:     isDark ? '#2A4035' : '#E2EDE6',
    text:       isDark ? '#E8F5EE' : '#1A2E23',
    textMuted:  isDark ? '#7FAE94' : '#617180',
    inputBg:    isDark ? '#1E3228' : '#F4FAF6',
    accent:     t.accent,
    accentSoft: isDark ? '#1A3828' : '#E4F5E9',
    error:      t.error,
  };

  const [containers, setContainers]       = useState([]);
  const [loadingMap, setLoadingMap]       = useState(true);
  const [userLocation, setUserLocation]   = useState(null);
  const [locationError, setLocationError] = useState('');
  const [activeFilter, setActiveFilter]   = useState('Todos');
  const [panel, setPanel]                 = useState(null);
  const [showLegend, setShowLegend]       = useState(false);
  // panel: null | {type:'point',data} | {type:'report',lat,lng,prefillTitle} | {type:'success'}

  // Cargar contenedores desde Supabase
  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setContainers(FALLBACK_POINTS);
        setLoadingMap(false);
        return;
      }
      const { data, error } = await supabase
        .from('containers')
        .select('id, title, latitude, longitude, type, materials, status, color');

      if (error || !data || data.length === 0) {
        setContainers(FALLBACK_POINTS);
      } else {
        // Normalizar para que coincida con el formato esperado
        setContainers(data.map((c) => ({
          id:        c.id,
          lat:       parseFloat(c.latitude),
          lng:       parseFloat(c.longitude),
          title:     c.title,
          type:      c.type,
          materials: c.materials || [c.type],
          status:    c.status || 'activo',
          color:     c.color || '#2E9E65',
        })));
      }
      setLoadingMap(false);
    })();
  }, []);

  // Pedir permiso de ubicación
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permiso de ubicación denegado.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  function sendToMap(msg) {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  }

  function handleWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      Keyboard.dismiss();
      if (msg.type === 'PIN_TAPPED') setPanel({ type: 'point', data: msg.point });
      if (msg.type === 'MAP_TAPPED') setPanel({ type: 'report', lat: msg.lat, lng: msg.lng, prefillTitle: '' });
    } catch (e) {}
  }

  function handleClosePanel() {
    sendToMap({ type: 'CLEAR_TEMP' });
    setPanel(null);
  }

  function handleOpenReport(lat, lng, prefillTitle) {
    setPanel({ type: 'report', lat, lng, prefillTitle });
  }

  async function handleReportSuccess() {
    sendToMap({ type: 'CLEAR_TEMP' });
    setPanel({ type: 'success' });
    // Refrescar puntos del usuario en App.js
    if (onReportSuccess) await onReportSuccess();
  }

  // Filtrar contenedores según el filtro activo
  const filteredContainers = activeFilter === 'Todos'
    ? containers
    : containers.filter((c) => {
        const mats = Array.isArray(c.materials) ? c.materials : [c.type];
        return mats.some((m) => m.toLowerCase() === activeFilter.toLowerCase());
      });

  const { card, border, text, textMuted, accent } = colors;
  const bg = isDark ? '#0F1F18' : '#EEF3F1';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* ── HEADER + FILTROS ── */}
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ gap: 3 }}>
            <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Cerca de ti</Text>
            <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
              Mapa de reciclaje
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Botón leyenda */}
            <Pressable
              onPress={() => setShowLegend((v) => !v)}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: showLegend ? accent : (isDark ? '#1E3A28' : '#E2F5E9'),
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 20 }}>🗺️</Text>
            </Pressable>
            {/* Botón centrar */}
            <Pressable
              onPress={() => userLocation && sendToMap({ type: 'CENTER_USER', lat: userLocation.lat, lng: userLocation.lng })}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: isDark ? '#1E3A28' : '#E2F5E9',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 20 }}>📍</Text>
            </Pressable>
          </View>
        </View>

        {/* Leyenda de colores (toggle) */}
        {showLegend && (
          <View style={{
            backgroundColor: card, borderRadius: 16, padding: 12,
            borderWidth: 1, borderColor: border,
            flexDirection: 'row', justifyContent: 'space-around',
          }}>
            {LEGEND.map((l) => (
              <View key={l.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: l.color }} />
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600' }}>{l.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={{
                    backgroundColor: isActive ? accent : (isDark ? '#1A3828' : '#EAF4ED'),
                    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
                    borderWidth: 1, borderColor: isActive ? accent : border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#FFF' : (isDark ? '#5AD492' : '#2E7A50') }}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── MAPA ── */}
      <View style={{ flex: 1, position: 'relative' }}>
        {loadingMap ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={{ color: textMuted, fontSize: 13 }}>Cargando puntos de reciclaje...</Text>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html: buildMapHTML({
              points: filteredContainers,
              isDark,
              userLat: userLocation?.lat,
              userLng: userLocation?.lng,
            })}}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            style={{ flex: 1, backgroundColor: bg }}
            scrollEnabled={false}
          />
        )}

        {/* Badge contador */}
        {!loadingMap && (
          <View style={{
            position: 'absolute', top: 12, left: 12,
            backgroundColor: card, borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 7,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            borderWidth: 1, borderColor: border,
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 }, elevation: 4,
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
            <Text style={{ color: text, fontSize: 12, fontWeight: '700' }}>
              {filteredContainers.length} punto{filteredContainers.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Hint de interacción */}
        {!panel && !loadingMap && (
          <View style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            backgroundColor: card, borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 10,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: border,
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 }, elevation: 4,
          }}>
            <Text style={{ fontSize: 18 }}>💡</Text>
            <Text style={{ color: textMuted, fontSize: 12, flex: 1, lineHeight: 17 }}>
              Toca un <Text style={{ fontWeight: '800', color: text }}>pin ♻</Text> para ver info,
              o toca el mapa para <Text style={{ fontWeight: '800', color: text }}>reportar</Text>.
            </Text>
          </View>
        )}

        {/* Error de ubicación */}
        {locationError ? (
          <View style={{
            position: 'absolute', top: 12, left: 12, right: 12,
            backgroundColor: isDark ? '#2A1215' : '#FFF0F2',
            borderRadius: 12, padding: 10,
            borderLeftWidth: 3, borderLeftColor: colors.error,
          }}>
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>⚠ {locationError}</Text>
          </View>
        ) : null}
      </View>

      {/* ── PANELES EN MODAL ── */}
      <BottomSheet visible={panel?.type === 'point'} onClose={handleClosePanel}>
        {panel?.type === 'point' && (
          <PointInfoPanel
            point={panel.data}
            onClose={handleClosePanel}
            onReport={handleOpenReport}
            isDark={isDark}
            colors={colors}
          />
        )}
      </BottomSheet>

      <BottomSheet visible={panel?.type === 'report'} onClose={handleClosePanel}>
        {panel?.type === 'report' && (
          <ReportPanel
            lat={panel.lat}
            lng={panel.lng}
            prefillTitle={panel.prefillTitle}
            onClose={handleClosePanel}
            onSuccess={handleReportSuccess}
            isDark={isDark}
            colors={colors}
            currentUser={currentUser}
          />
        )}
      </BottomSheet>

      <BottomSheet visible={panel?.type === 'success'} onClose={handleClosePanel}>
        {panel?.type === 'success' && (
          <SuccessPanel
            onClose={handleClosePanel}
            isDark={isDark}
            colors={colors}
          />
        )}
      </BottomSheet>

    </View>
  );
}