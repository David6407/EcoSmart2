import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { REPORT_STATUS, REPORT_STATUS_META } from '../../domain/constants/reportStatus';
import { buildMapHTML as buildLeafletMapHTML } from '../../infrastructure/map/LeafletHtmlBuilder';
import { useUser } from '../../shared/context/UserContext';
import { container } from '../../shared/di/container';
import { getFriendlyError } from '../../shared/errors/errorHandler';
import { getDayKey } from '../../shared/utils/dateUtils';
import { calculateDistanceMeters } from '../../shared/utils/geoUtils';
import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { getTheme } from '../styles/appStyles';

const mapHelpIcon = require('../../../assets/MapIcons/maphelp.png');
const locateIcon = require('../../../assets/MapIcons/locate.png');

// ─────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────
const MATERIAL_TYPES = ['Plástico', 'Papel', 'Vidrio', 'Orgánico', 'Metal', 'Electrónico'];
const FILTERS        = ['Todos', 'Plastico', 'Vidrio', 'Organico', 'Reportes'];

const COLLECTOR_STATUS_FILTERS = ['todos', REPORT_STATUS.PENDING, REPORT_STATUS.ASSIGNED, REPORT_STATUS.IN_PROGRESS];
const COLLECTOR_TIME_FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
];
const COLLECTOR_ASSIGNMENT_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Mios' },
  { id: 'unassigned', label: 'Sin asignar' },
];

const MATERIAL_ICONS = {
  Plastico:    '🥤',
  Vidrio:      '🍾',
  Organico:    '🌿',
  Papel:       '📰',
  Metal:       '🔧',
  Electronico: '💻',
};

const LEGEND = [
  { color: '#2E9E65', label: 'Activo',        status: 'activo'        },
  { color: '#FBC02D', label: 'Mantenimiento', status: 'mantenimiento' },
  { color: '#EF5350', label: 'Inactivo',       status: 'inactivo'      },
  { color: '#1976D2', label: 'Reporte',        status: 'reporte'       },
];

const REPORT_COOLDOWN_MINUTES = 15;
const REPORT_DAILY_LIMIT = 5;
const REPORT_MAX_DISTANCE_METERS = 50;

function isWithinWeek(value) {
  if (!value) return false;
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= 7 * 86400000;
}

function buildReportPoint(report) {
  if (!report?.id) return null;

  const lat = Number(report.latitude);
  const lng = Number(report.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const meta = REPORT_STATUS_META[report.status] || REPORT_STATUS_META.pendiente;
  return {
    id:          `report-${report.id}`,
    kind:        'report',
    lat,
    lng,
    title:       report.title,
    description: report.description,
    status:      report.status || REPORT_STATUS.PENDING,
    collectorId: report.collector_id,
    createdAt:   report.created_at,
    assignedAt:  report.assigned_at,
    startedAt:   report.started_at,
    citizenPhotoUrl: report.citizen_photo_url,
    citizenPhotoPath: report.citizen_photo_path,
    type:        'Reporte',
    materials:   ['Reporte'],
    color:       meta.color,
    icon:        '!',
  };
}

function mergeGuaranteedReportPoint(points, report) {
  const guaranteedPoint = buildReportPoint(report);
  if (!guaranteedPoint) return points;

  const withoutDuplicate = points.filter((point) => point.id !== guaranteedPoint.id);
  return [...withoutDuplicate, guaranteedPoint];
}

// ─────────────────────────────────────────────────────────────────
// Chips de filtro
// ─────────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress, colors, isDark }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accent : (isDark ? '#1A3828' : '#EAF4ED'),
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : (isDark ? '#5AD492' : '#2E7A50') }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SmallFilterChip({ label, active, onPress, colors, isDark }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accent : (isDark ? '#1A3828' : '#F0F8F2'),
        borderRadius: 10,
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : (isDark ? '#5AD492' : '#2E7A50') }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterGroupRow({ title, children, colors }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {children}
      </View>
    </View>
  );
}

// Fallback si Supabase no está configurado
const FALLBACK_POINTS = [
  { id: 'p1', lat: 1.2136, lng: -77.2811, title: 'Punto Verde Centro',   type: 'Plastico',  materials: ['Plastico','Papel'],  color: '#2E9E65', status: 'activo'        },
  { id: 'p2', lat: 1.2180, lng: -77.2750, title: 'Reciclaje La Aurora',  type: 'Vidrio',    materials: ['Vidrio','Metal'],    color: '#FBC02D', status: 'mantenimiento' },
  { id: 'p3', lat: 1.2090, lng: -77.2900, title: 'Ecopunto Sur',         type: 'Organico',  materials: ['Organico','Papel'],  color: '#2E9E65', status: 'activo'        },
  { id: 'p4', lat: 1.2200, lng: -77.2870, title: 'Punto Plástico Norte', type: 'Plastico',  materials: ['Plastico'],          color: '#FBC02D', status: 'mantenimiento' },
];

// ─────────────────────────────────────────────────────────────────
// BottomSheet genérico
// ─────────────────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
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
// Sheet de filtros del recolector
// ─────────────────────────────────────────────────────────────────
function CollectorFilterSheet({ visible, onClose, filters, onChange, colors, isDark }) {
  const { card, border, text, textMuted, accent } = colors;

  const activeCount = [
    filters.status !== 'todos',
    filters.time !== 'all',
    filters.assignment !== 'all',
  ].filter(Boolean).length;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{
        backgroundColor: card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 20, gap: 18,
        borderWidth: 1, borderBottomWidth: 0, borderColor: border,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border, alignSelf: 'center', marginTop: -4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: text, fontSize: 17, fontWeight: '900' }}>Filtros de reportes</Text>
            {activeCount > 0 && (
              <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{activeCount} filtro{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1E3228' : '#EEF3F1', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: textMuted, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>

        <FilterGroupRow title="Estado" colors={colors}>
          {COLLECTOR_STATUS_FILTERS.map((status) => (
            <SmallFilterChip
              key={status}
              label={status === 'todos' ? 'Todos' : REPORT_STATUS_META[status]?.label}
              active={filters.status === status}
              onPress={() => onChange({ ...filters, status })}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </FilterGroupRow>

        <FilterGroupRow title="Tiempo" colors={colors}>
          {COLLECTOR_TIME_FILTERS.map((item) => (
            <SmallFilterChip
              key={item.id}
              label={item.label}
              active={filters.time === item.id}
              onPress={() => onChange({ ...filters, time: item.id })}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </FilterGroupRow>

        <FilterGroupRow title="Asignacion" colors={colors}>
          {COLLECTOR_ASSIGNMENT_FILTERS.map((item) => (
            <SmallFilterChip
              key={item.id}
              label={item.label}
              active={filters.assignment === item.id}
              onPress={() => onChange({ ...filters, assignment: item.id })}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </FilterGroupRow>

        {activeCount > 0 && (
          <Pressable
            onPress={() => onChange({ status: 'todos', time: 'all', assignment: 'all' })}
            style={{ alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: textMuted, fontSize: 13, fontWeight: '700' }}>Limpiar filtros</Text>
          </Pressable>
        )}
        <View style={{ height: Platform.OS === 'ios' ? 12 : 4 }} />
      </View>
    </BottomSheet>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: info de punto
// ─────────────────────────────────────────────────────────────────
function PointInfoPanel({ point, onClose, onReport, isDark, colors, currentUser }) {
  const { card, border, text, textMuted, accent, accentSoft } = colors;

  const statusMap = {
    activo:        { label: '● Activo',         color: accent },
    mantenimiento: { label: '⚠ Mantenimiento',  color: '#D4A017' },
    inactivo:      { label: '✕ Inactivo',        color: colors.error },
    pendiente:     { label: 'Pendiente',          color: '#D4A017' },
    asignado:      { label: 'Asignado',           color: '#7B61FF' },
    en_proceso:    { label: 'En proceso',         color: '#1976D2' },
    recolectado:   { label: 'Recolectado',        color: accent },
    rechazado:     { label: 'Rechazado',          color: colors.error },
    validado:      { label: 'Validado',           color: accent },
  };
  const statusInfo = statusMap[point.status] || statusMap.activo;
  const isReport = point.kind === 'report';
  const canCreateReport = currentUser?.role !== 'collector' && !isReport;
  const materials = Array.isArray(point.materials) ? point.materials : [point.type].filter(Boolean);

  return (
    <View style={{
      backgroundColor: card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 20, gap: 16,
      borderWidth: 1, borderBottomWidth: 0, borderColor: border,
    }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border, alignSelf: 'center', marginTop: -4 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#1E3228' : '#F4FAF6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: statusInfo.color, fontSize: 11, fontWeight: '800' }}>{statusInfo.label}</Text>
          </View>
          <Text style={{ color: text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{point.title}</Text>
          <Text style={{ color: textMuted, fontSize: 13 }}>
            {isReport ? 'Reporte ciudadano geolocalizado' : 'Punto de reciclaje verificado'}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1E3228' : '#EEF3F1', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: textMuted, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Materiales aceptados
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {materials.map((mat) => (
            <View key={mat} style={{ backgroundColor: accentSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: border }}>
              <Text style={{ color: isDark ? '#5AD492' : '#2E7A50', fontSize: 12, fontWeight: '700' }}>
                {MATERIAL_ICONS[mat] || '♻️'} {mat}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {isReport && point.description ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Descripcion</Text>
          <Text style={{ color: textMuted, fontSize: 13, lineHeight: 19 }}>{point.description}</Text>
        </View>
      ) : null}

      {canCreateReport ? (
        <Pressable
          onPress={() => onReport(point.lat, point.lng, point.title)}
          disabled={point.status === 'inactivo'}
          style={({ pressed }) => ({
            backgroundColor: point.status === 'inactivo' ? (isDark ? '#1E2820' : '#EEF3F1') : accent,
            borderRadius: 16, paddingVertical: 15, alignItems: 'center', opacity: pressed ? 0.85 : 1,
            shadowColor: isDark ? '#2E9E65' : '#1B6B40',
            shadowOpacity: point.status === 'inactivo' ? 0 : 0.3,
            shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', letterSpacing: 0.3, color: point.status === 'inactivo' ? textMuted : '#FFF' }}>
            {point.status === 'inactivo' ? 'Punto no disponible' : 'Reportar visita →'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: formulario de reporte (con foto opcional)
// ─────────────────────────────────────────────────────────────────
function ReportPanel({ lat, lng, prefillTitle, onClose, onSuccess, isDark, colors, currentUser, currentLocation }) {
  const { card, border, text, textMuted, accent, accentSoft, inputBg, error: errorColor } = colors;
  const [title, setTitle]                         = useState(prefillTitle || '');
  const [description, setDescription]             = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [photo, setPhoto]                         = useState(null);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [formError, setFormError]                 = useState('');
  const reportDistanceMeters                      = calculateDistanceMeters(currentLocation, { latitude: lat, longitude: lng });
  const isWithinAllowedRange                      = reportDistanceMeters != null && reportDistanceMeters <= REPORT_MAX_DISTANCE_METERS;

  function toggleMaterial(mat) {
    setSelectedMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  }

  async function pickPhoto() {
    setFormError('');
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission  = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Permite el acceso a fotos para adjuntar evidencia.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.72,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
        setFormError('La foto no puede superar 3 MB. Elige otra imagen.');
        return;
      }
      setPhoto(asset);
    } catch (_err) {
      setFormError('Instala expo-image-picker para adjuntar fotos.');
    }
  }

  async function handleSubmit() {
    if (!title.trim()) { setFormError('Agrega un título al reporte.'); return; }
    if (!container.isSupabaseConfigured) { setFormError('Supabase no esta configurado.'); return; }
    if (!currentUser?.id) { setFormError('No se pudo identificar al usuario actual.'); return; }
    if (!currentLocation) { setFormError('Necesitamos tu ubicacion actual para validar la cercania del reporte.'); return; }
    if (!isWithinAllowedRange) {
      setFormError(`Solo puedes reportar dentro de ${REPORT_MAX_DISTANCE_METERS} m de tu ubicacion actual.`);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const fullDescription = [
      description.trim(),
      selectedMaterials.length > 0 ? `Materiales: ${selectedMaterials.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    try {
      await container.usecases.createReportUseCase({
        userId:          currentUser.id,
        title,
        description:     fullDescription,
        latitude:        lat,
        longitude:       lng,
        pointsAwarded:   10,
        cooldownMinutes: REPORT_COOLDOWN_MINUTES,
        dailyLimit:      REPORT_DAILY_LIMIT,
        currentLocation,
        maxDistanceMeters: REPORT_MAX_DISTANCE_METERS,
        photo:           photo || null,
      });
      onSuccess();
    } catch (error) {
      setFormError(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
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
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border, alignSelf: 'center', marginTop: -4 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: text, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>Nuevo reporte</Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                Cooldown de 15 min · máximo 5 reportes por día
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1E3228' : '#EEF3F1', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: textMuted, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>

          {/* Coordenadas */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: accent }} />
            <Text style={{ color: textMuted, fontSize: 12 }}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
          </View>

          <View style={{ backgroundColor: accentSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, gap: 4 }}>
            <Text style={{ color: text, fontSize: 12, fontWeight: '800' }}>
              Rango permitido para reportar: {REPORT_MAX_DISTANCE_METERS} m
            </Text>
            <Text style={{ color: textMuted, fontSize: 12, lineHeight: 17 }}>
              {reportDistanceMeters == null
                ? 'Activa la ubicacion del dispositivo para validar que el reporte se crea cerca de ti.'
                : `Distancia al punto seleccionado: ${reportDistanceMeters} m.`}
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

          {/* Foto opcional */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Foto del problema (opcional)
            </Text>
            <Pressable
              onPress={pickPhoto}
              disabled={isSubmitting}
              style={{
                minHeight: 130,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: photo ? accent : border,
                borderStyle: photo ? 'solid' : 'dashed',
                backgroundColor: accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {photo?.uri ? (
                <View style={{ width: '100%' }}>
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                  <Pressable
                    onPress={() => setPhoto(null)}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900' }}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 6, padding: 16 }}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: accent, fontSize: 13, fontWeight: '800' }}>Agregar foto</Text>
                  <Text style={{ color: textMuted, fontSize: 11, textAlign: 'center' }}>JPG, PNG o WebP · máx. 3 MB</Text>
                </View>
              )}
            </Pressable>
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

          {formError ? (
            <View style={{ backgroundColor: isDark ? '#2A1215' : '#FFF0F2', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: errorColor }}>
              <Text style={{ color: errorColor, fontSize: 12, fontWeight: '600' }}>⚠ {formError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => ({
              backgroundColor: accent, borderRadius: 16, paddingVertical: 15,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              opacity: isSubmitting || pressed || !currentLocation || !isWithinAllowedRange ? 0.6 : 1,
              shadowColor: isDark ? '#2E9E65' : '#1B6B40',
              shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
              marginBottom: Platform.OS === 'android' ? 8 : 0,
            })}
          >
            {isSubmitting && <ActivityIndicator size="small" color="#FFF" />}
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>
              {isSubmitting ? (photo ? 'Subiendo foto...' : 'Enviando...') : 'Enviar reporte →'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: éxito
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
      <View style={{ backgroundColor: accentSoft, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20 }}>⭐</Text>
        <Text style={{ color: accent, fontSize: 15, fontWeight: '900' }}>Puntos tras verificacion</Text>
      </View>
      <Text style={{ color: textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
        Tu reporte quedó registrado como{' '}
        <Text style={{ fontWeight: '800', color: accent }}>pendiente</Text>.{'\n'}
        Los puntos se acreditan cuando la recoleccion sea verificada.
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
export function MapScreen({ currentUser, onReportSuccess, isDark = false }) {
  const t          = getTheme(isDark);
  const webviewRef = useRef(null);
  const flyToSendTimerRef     = useRef(null);
  const flyToFallbackTimerRef = useRef(null);
  const { selectedReport, selectedReportId, setSelectedReportId } = useUser();
  const pendingFlyToRef       = useRef(null);

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

  const [containers, setContainers]               = useState([]);
  const [loadingMap, setLoadingMap]               = useState(true);
  const [mapReady, setMapReady]                   = useState(false); // ← NUEVO
  const [userLocation, setUserLocation]           = useState(null);
  const [locationError, setLocationError]         = useState('');
  const [activeFilter, setActiveFilter]           = useState('Todos');
  const [reportMapFilters, setReportMapFilters]   = useState({ status: 'todos', time: 'all', assignment: 'all' });
  const [panel, setPanel]                         = useState(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [loadingReportDetail, setLoadingReportDetail]   = useState(false);
  const [confirmingReportId, setConfirmingReportId]     = useState('');
  const [showLegend, setShowLegend]               = useState(false);
  const [showCollectorFilters, setShowCollectorFilters] = useState(false);
  const [flyToWarning, setFlyToWarning]           = useState('');

  const loadMapPoints = useCallback(async () => {
    if (!container.isSupabaseConfigured) {
      const fallbackPoints = FALLBACK_POINTS.map((p) => ({ ...p, kind: 'container', icon: '♻' }));
      setContainers(mergeGuaranteedReportPoint(fallbackPoints, selectedReport));
      setLoadingMap(false);
      return;
    }

    try {
      const result = await container.usecases.loadMapPointsUseCase();
      const containerData = result.containers;
      const reportData    = result.reports;

      const containerPoints = !containerData || containerData.length === 0
        ? FALLBACK_POINTS.map((p) => ({ ...p, kind: 'container', icon: '♻' }))
        : containerData.map((c) => ({
            id:        c.id,
            kind:      'container',
            lat:       parseFloat(c.latitude),
            lng:       parseFloat(c.longitude),
            title:     c.title,
            type:      c.type,
            materials: c.materials || [c.type],
            status:    c.status || 'activo',
            color:     c.color || '#2E9E65',
            icon:      '♻',
          }));

      const reportPoints = (reportData || [])
        .map(buildReportPoint)
        .filter(Boolean);
      const allPoints = mergeGuaranteedReportPoint([...containerPoints, ...reportPoints], selectedReport);

      setContainers(allPoints);
    } catch (_error) {
      const fallbackPoints = FALLBACK_POINTS.map((p) => ({ ...p, kind: 'container', icon: '♻' }));
      setContainers(mergeGuaranteedReportPoint(fallbackPoints, selectedReport));
    } finally {
      setLoadingMap(false);
    }
  }, [selectedReport]);

  // Al abrir desde la lista, garantizamos el pin del reporte y enfocamos la vista de reportes.
  useEffect(() => {
    const reportId = selectedReportId || selectedReport?.id;
    if (!reportId) return;

    const lat = Number(selectedReport?.latitude);
    const lng = Number(selectedReport?.longitude);
    pendingFlyToRef.current = {
      id: reportId,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };

    setActiveFilter('Reportes');
    setReportMapFilters({ status: 'todos', time: 'all', assignment: 'all' });
    setFlyToWarning('');
  }, [selectedReport, selectedReportId]);

  // ── FIX 2: cargar puntos sin intentar el flyTo aquí.
  useEffect(() => {
    loadMapPoints();
  }, [loadMapPoints]);

  // ── FIX 4: cuando los datos del mapa o los filtros cambian, el WebView recibe
  //    un HTML completamente nuevo y se destruye internamente. Resetear mapReady
  //    para que onLoadEnd vuelva a dispararse y el flyTo funcione con los pines
  //    ya presentes en el nuevo HTML.
  useEffect(() => {
    setMapReady(false);
  }, [containers, activeFilter, reportMapFilters]);

  // Dispara el enfoque solo cuando el WebView y los puntos ya estan listos.
  useEffect(() => {
    if (!mapReady) return;
    const target = pendingFlyToRef.current;
    if (!target?.id) return;
    pendingFlyToRef.current = null;

    clearTimeout(flyToSendTimerRef.current);
    clearTimeout(flyToFallbackTimerRef.current);

    // Pequeño delay para que Leaflet procese los pines antes de recibir el mensaje
    flyToSendTimerRef.current = setTimeout(() => {
      sendToMap({ type: 'FLY_TO_REPORT', id: target.id, lat: target.lat, lng: target.lng });
      flyToFallbackTimerRef.current = setTimeout(() => {
        setSelectedReportId(null);
        setFlyToWarning('No se pudo confirmar el centrado. Toca el pin en el mapa.');
      }, 2500);
    }, 150);
  }, [mapReady, containers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Permiso de ubicación denegado.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  function sendToMap(msg) { webviewRef.current?.postMessage(JSON.stringify(msg)); }

  function handleWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      Keyboard.dismiss();
      if (msg.type === 'FLY_TO_CONFIRMED') {
        clearTimeout(flyToFallbackTimerRef.current);
        setSelectedReportId(null);
        setFlyToWarning('');
      }
      if (msg.type === 'PIN_TAPPED') {
        if (msg.point?.kind === 'report') { openReportDetail(msg.point); return; }
        setPanel({ type: 'point', data: msg.point });
      }
      if (msg.type === 'MAP_TAPPED') {
        if (currentUser?.role === 'collector') { sendToMap({ type: 'CLEAR_TEMP' }); return; }
        setPanel({ type: 'report', lat: msg.lat, lng: msg.lng, prefillTitle: '' });
      }
    } catch (e) {}
  }

  function handleClosePanel() { sendToMap({ type: 'CLEAR_TEMP' }); setPanel(null); }
  function handleOpenReport(lat, lng, prefillTitle) { setPanel({ type: 'report', lat, lng, prefillTitle }); }

  async function openReportDetail(point) {
    setLoadingReportDetail(true);
    setPanel(null);
    setFlyToWarning('');
    try {
      const reportId = String(point.id || '').replace('report-', '');
      const report   = await container.usecases.loadReportDetailUseCase(reportId);
      setSelectedReportDetail({
        ...report,
        citizen_photo_url: report?.citizen_photo_url || point.citizenPhotoUrl,
        citizen_photo_path: report?.citizen_photo_path || point.citizenPhotoPath,
      });
    } catch (error) {
      setFlyToWarning(getFriendlyError(error, 'No se pudo cargar el detalle del reporte.'));
    } finally {
      setLoadingReportDetail(false);
    }
  }

  async function handleReportSuccess() {
    sendToMap({ type: 'CLEAR_TEMP' });
    setPanel({ type: 'success' });
    await loadMapPoints();
    if (onReportSuccess) await onReportSuccess();
  }

  async function handleConfirmCollection(report) {
    setConfirmingReportId(report.id);
    setFlyToWarning('');
    try {
      await container.usecases.confirmCollectionUseCase({ reportId: report.id, citizenId: currentUser.id });
      const refreshed = await container.usecases.loadReportDetailUseCase(report.id);
      setSelectedReportDetail(refreshed);
      await loadMapPoints();
      if (onReportSuccess) await onReportSuccess();
    } catch (error) {
      setFlyToWarning(getFriendlyError(error));
    } finally {
      setConfirmingReportId('');
    }
  }

  function matchesCollectorReportFilters(point) {
    if (point.kind !== 'report' || currentUser?.role !== 'collector') return true;
    if (reportMapFilters.status !== 'todos' && point.status !== reportMapFilters.status) return false;
    if (reportMapFilters.assignment === 'mine' && point.collectorId !== currentUser?.id) return false;
    if (reportMapFilters.assignment === 'unassigned' && point.collectorId) return false;
    const relevantDate = point.startedAt || point.assignedAt || point.createdAt;
    if (reportMapFilters.time === 'today' && getDayKey(relevantDate) !== getDayKey(new Date().toISOString())) return false;
    if (reportMapFilters.time === 'week' && !isWithinWeek(relevantDate)) return false;
    return true;
  }

  const filteredContainers = activeFilter === 'Todos'
    ? containers.filter(matchesCollectorReportFilters)
    : containers.filter((c) => {
        if (activeFilter === 'Reportes') return c.kind === 'report' && matchesCollectorReportFilters(c);
        const mats = Array.isArray(c.materials) ? c.materials : [c.type];
        return mats.some((m) => m.toLowerCase() === activeFilter.toLowerCase());
      });

  const { card, border, text, textMuted, accent } = colors;
  const bg = isDark ? '#0F1F18' : '#EEF3F1';

  const activeCollectorFiltersCount = [
    reportMapFilters.status !== 'todos',
    reportMapFilters.time !== 'all',
    reportMapFilters.assignment !== 'all',
  ].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* ── HEADER ── */}
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 1 }}>
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600' }}>Cerca de ti</Text>
            <Text style={{ color: text, fontSize: 24, fontWeight: '900', letterSpacing: -0.8 }}>Mapa de reciclaje</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setShowLegend((v) => !v)}
              style={({ pressed }) => ({
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: showLegend ? accent : (isDark ? '#1E3A28' : '#E2F5E9'),
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Image source={mapHelpIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </Pressable>
            <Pressable
              onPress={() => userLocation && sendToMap({ type: 'CENTER_USER', lat: userLocation.lat, lng: userLocation.lng })}
              style={({ pressed }) => ({
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: isDark ? '#1E3A28' : '#E2F5E9',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Image source={locateIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </Pressable>
          </View>
        </View>

        {showLegend && (
          <View style={{
            backgroundColor: card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
            borderWidth: 1, borderColor: border,
            flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8,
          }}>
            {LEGEND.map((l) => (
              <View key={l.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
                <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>{l.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Barra de filtros horizontal */}
        <View style={{ backgroundColor: card, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            {FILTERS.map((f) => (
              <FilterChip key={f} label={f} active={activeFilter === f} onPress={() => setActiveFilter(f)} colors={colors} isDark={isDark} />
            ))}

            {currentUser?.role === 'collector' && (
              <>
                <View style={{ width: 1, height: 24, backgroundColor: border, marginHorizontal: 4 }} />
                <Pressable
                  onPress={() => setShowCollectorFilters(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: activeCollectorFiltersCount > 0 ? colors.accentSoft : (isDark ? '#1A3828' : '#EAF4ED'),
                    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
                    borderWidth: 1, borderColor: activeCollectorFiltersCount > 0 ? accent : border,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ fontSize: 13 }}>⚙️</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: activeCollectorFiltersCount > 0 ? accent : (isDark ? '#5AD492' : '#2E7A50') }}>
                    Filtros
                  </Text>
                  {activeCollectorFiltersCount > 0 && (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>{activeCollectorFiltersCount}</Text>
                    </View>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
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
            source={{ html: buildLeafletMapHTML({ points: filteredContainers, isDark, userLat: userLocation?.lat, userLng: userLocation?.lng }) }}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => setMapReady(true)}  // ← NUEVO: notifica cuando Leaflet terminó de cargar
            javaScriptEnabled
            style={{ flex: 1, backgroundColor: bg }}
            scrollEnabled={false}
          />
        )}

        {loadingReportDetail ? (
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.28)', gap: 10 }}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>Cargando detalle del reporte...</Text>
          </View>
        ) : null}

        {!loadingMap && (
          <View style={{
            position: 'absolute', top: 12, left: 12,
            backgroundColor: card, borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 7,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            borderWidth: 1, borderColor: border,
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
            <Text style={{ color: text, fontSize: 12, fontWeight: '700' }}>
              {filteredContainers.length} punto{filteredContainers.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {!panel && !loadingMap && !loadingReportDetail && (
          <View style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            backgroundColor: card, borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 10,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: border,
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
          }}>
            <Text style={{ fontSize: 18 }}>💡</Text>
            <Text style={{ color: textMuted, fontSize: 12, flex: 1, lineHeight: 17 }}>
              Toca un pin para ver detalle
              {currentUser?.role !== 'collector'
                ? <Text>, o toca el mapa para <Text style={{ fontWeight: '800', color: text }}>reportar</Text>.</Text>
                : '.'}
            </Text>
          </View>
        )}

        {locationError ? (
          <View style={{ position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: isDark ? '#2A1215' : '#FFF0F2', borderRadius: 12, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.error }}>
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>⚠ {locationError}</Text>
          </View>
        ) : null}

        {flyToWarning ? (
          <View style={{ position: 'absolute', top: locationError ? 62 : 12, left: 12, right: 12, backgroundColor: '#FFF8E6', borderRadius: 12, padding: 10, borderLeftWidth: 3, borderLeftColor: '#D4A017' }}>
            <Text style={{ color: '#854F0B', fontSize: 12, fontWeight: '700' }}>{flyToWarning}</Text>
          </View>
        ) : null}
      </View>

      {/* ── PANELES EN MODAL ── */}
      <BottomSheet visible={panel?.type === 'point'} onClose={handleClosePanel}>
        {panel?.type === 'point' && (
          <PointInfoPanel point={panel.data} onClose={handleClosePanel} onReport={handleOpenReport} isDark={isDark} colors={colors} currentUser={currentUser} />
        )}
      </BottomSheet>

      <BottomSheet visible={panel?.type === 'report'} onClose={handleClosePanel}>
        {panel?.type === 'report' && (
          <ReportPanel lat={panel.lat} lng={panel.lng} prefillTitle={panel.prefillTitle} onClose={handleClosePanel} onSuccess={handleReportSuccess} isDark={isDark} colors={colors} currentUser={currentUser} currentLocation={userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : null} />
        )}
      </BottomSheet>

      <BottomSheet visible={panel?.type === 'success'} onClose={handleClosePanel}>
        {panel?.type === 'success' && <SuccessPanel onClose={handleClosePanel} isDark={isDark} colors={colors} />}
      </BottomSheet>

      <CollectorFilterSheet
        visible={showCollectorFilters}
        onClose={() => setShowCollectorFilters(false)}
        filters={reportMapFilters}
        onChange={setReportMapFilters}
        colors={colors}
        isDark={isDark}
      />

      <ReportDetailSheet
        report={selectedReportDetail}
        visible={Boolean(selectedReportDetail)}
        currentUser={currentUser}
        confirmBusy={confirmingReportId === selectedReportDetail?.id}
        onClose={() => setSelectedReportDetail(null)}
        onOpenMap={() => setSelectedReportDetail(null)}
        onConfirm={handleConfirmCollection}
        colors={colors}
      />
    </View>
  );
}
