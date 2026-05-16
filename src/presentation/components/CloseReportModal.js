import * as Location from 'expo-location';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ErrorMessage } from './ErrorMessage';

export function CloseReportModal({ visible, report, busy, colors, onClose, onSubmit }) {
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [error, setError] = useState('');

  function resetAndClose() {
    setPhoto(null);
    setNotes('');
    setIncludeLocation(false);
    setError('');
    onClose();
  }

  async function pickPhoto() {
    setError('');

    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Permite el acceso a fotos para adjuntar evidencia.');
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
        setError('La foto no puede superar 3MB. Intenta con otra imagen.');
        return;
      }

      setPhoto(asset);
    } catch (_error) {
      setError('Instala expo-image-picker para seleccionar evidencia fotografica.');
    }
  }

  async function handleSubmit() {
    const cleanNotes = notes.trim();
    if (!photo?.uri && !cleanNotes) {
      setError('Agrega una foto o una nota antes de cerrar el reporte.');
      return;
    }

    let location = null;
    if (includeLocation) {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        location = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
      }
    }

    let result;
    try {
      result = await onSubmit({
        photo,
        notes: cleanNotes,
        location,
      });
    } catch (submitError) {
      setError(submitError?.message || 'No se pudo cerrar el reporte.');
      return;
    }

    if (result === false) return;

    setPhoto(null);
    setNotes('');
    setIncludeLocation(false);
    setError('');
  }

  if (!report) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={resetAndClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' }}
        onPress={resetAndClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: colors.border,
              maxHeight: '90%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }} showsVerticalScrollIndicator={false}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: -4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 21, fontWeight: '900' }}>Cerrar recoleccion</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                    {report.title}
                  </Text>
                </View>
                <Pressable onPress={resetAndClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>X</Text>
                </Pressable>
              </View>

              <ErrorMessage error={error} color={colors.error} />

              <Pressable
                onPress={pickPhoto}
                disabled={busy}
                style={{
                  minHeight: 150,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: photo ? colors.accent : colors.border,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {photo?.uri ? (
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 190 }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 8, padding: 18 }}>
                    <Text style={{ color: colors.accent, fontSize: 28, fontWeight: '900' }}>+</Text>
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '900' }}>Agregar foto de evidencia</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>JPG o PNG, maximo 3MB.</Text>
                  </View>
                )}
              </Pressable>

              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  Notas del recolector
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Describe el resultado de la recoleccion..."
                  placeholderTextColor="#9EB0A4"
                  multiline
                  textAlignVertical="top"
                  style={{
                    minHeight: 110,
                    backgroundColor: '#F4FAF6',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    color: colors.text,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                />
              </View>

              <Pressable
                onPress={() => setIncludeLocation((value) => !value)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: includeLocation ? colors.accent : colors.border,
                    backgroundColor: includeLocation ? colors.accent : colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{includeLocation ? 'OK' : ''}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Adjuntar ubicacion actual</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={resetAndClose}
                  disabled={busy}
                  style={{ flex: 1, backgroundColor: colors.accentSoft, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '900' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={busy}
                  style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: busy ? 0.55 : 1 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>
                    {busy ? 'Cerrando...' : 'Cerrar reporte'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
