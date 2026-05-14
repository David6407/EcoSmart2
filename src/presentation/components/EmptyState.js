import { Pressable, Text, View } from 'react-native';

export function EmptyState({ message, actionLabel, onAction, colors = {} }) {
  const textMuted = colors.textMuted || '#617180';
  const accent = colors.accent || '#2E9E65';
  const accentSoft = colors.accentSoft || '#E4F5E9';

  return (
    <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
      <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
        {message}
      </Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            backgroundColor: accentSoft,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 9,
            marginTop: 4,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: accent, fontSize: 13, fontWeight: '800' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
