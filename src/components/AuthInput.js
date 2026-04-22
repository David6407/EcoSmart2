import { Text, TextInput, View } from 'react-native';

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
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#5A6B62' : '#9EB0A4'}
          style={s.inputField}
          autoCapitalize="none"
        />
      </View>
      {error ? <Text style={s.inputError}>{error}</Text> : null}
    </View>
  );
}
