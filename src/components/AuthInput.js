import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { getAuthStyles } from '../styles/appStyles';

export function AuthInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  placeholder,
  error,
  icon,
  isDark = false,
}) {
  const s = getAuthStyles(isDark);
  const [isPasswordHidden, setIsPasswordHidden] = useState(!!secureTextEntry);

  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={[s.inputWrapper, error ? s.inputWrapperError : null]}>
        {icon ? (
          <Text style={s.inputIcon}>{icon}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordHidden}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#5A6B62' : '#9EB0A4'}
          style={[s.inputField, { flex: 1 }]}
          autoCapitalize="none"
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsPasswordHidden(!isPasswordHidden)} style={{ paddingHorizontal: 10, justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, opacity: 0.6 }}>{isPasswordHidden ? '🔒' : '🔓'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={s.inputError}>{error}</Text> : null}
    </View>
  );
}
