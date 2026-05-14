import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { REPORT_STATUS_FILTERS, REPORT_STATUS_META } from '../../domain/constants/reportStatus';

const TIME_FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
];

const ASSIGNMENT_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Mios' },
  { id: 'unassigned', label: 'Sin asignar' },
];

function FilterChip({ label, active, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accent : colors.accentSoft,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
      }}
    >
      <Text style={{ color: active ? '#FFF' : colors.accent, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

export function ReportFilterBar({ filters, onChange, colors }) {
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {REPORT_STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              label={status === 'todos' ? 'Todos' : REPORT_STATUS_META[status]?.label}
              active={filters.status === status}
              onPress={() => onChange({ ...filters, status })}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TIME_FILTERS.map((item) => (
            <FilterChip key={item.id} label={item.label} active={filters.time === item.id} onPress={() => onChange({ ...filters, time: item.id })} colors={colors} />
          ))}
          {ASSIGNMENT_FILTERS.map((item) => (
            <FilterChip key={item.id} label={item.label} active={filters.assignment === item.id} onPress={() => onChange({ ...filters, assignment: item.id })} colors={colors} />
          ))}
        </View>
      </ScrollView>

      <TextInput
        value={filters.zone}
        onChangeText={(zone) => onChange({ ...filters, zone })}
        placeholder="Filtrar por zona"
        placeholderTextColor="#9EB0A4"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          color: colors.text,
          fontSize: 13,
        }}
      />
    </View>
  );
}
