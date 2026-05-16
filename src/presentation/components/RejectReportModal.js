import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ErrorMessage } from './ErrorMessage';

export function RejectReportModal({ visible, report, busy, colors, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function resetAndClose() {
    setReason('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('Describe por que el reporte no puede completarse.');
      return;
    }

    try {
      const result = await onSubmit(cleanReason);
      if (result === false) return;
      setReason('');
      setError('');
    } catch (submitError) {
      setError(submitError?.message || 'No se pudo rechazar el reporte.');
    }
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
              maxHeight: '82%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }} showsVerticalScrollIndicator={false}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: -4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 21, fontWeight: '900' }}>Rechazar reporte</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                    {report.title}
                  </Text>
                </View>
                <Pressable onPress={resetAndClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>X</Text>
                </Pressable>
              </View>

              <ErrorMessage error={error} color={colors.error} />

              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  Motivo
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={(value) => {
                    setReason(value);
                    if (error) setError('');
                  }}
                  placeholder="Ej: direccion incorrecta, residuo no recolectable, punto ya atendido..."
                  placeholderTextColor="#9EB0A4"
                  multiline
                  textAlignVertical="top"
                  style={{
                    minHeight: 120,
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
                  style={{ flex: 1, backgroundColor: colors.error, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: busy ? 0.55 : 1 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>
                    {busy ? 'Rechazando...' : 'Confirmar rechazo'}
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
