import { Pressable, Text, TextInput, View } from 'react-native';

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

const SORT_FILTERS = [
  { id: 'urgency', label: 'Urgencia' },
  { id: 'distance', label: 'Distancia' },
  { id: 'oldest', label: 'Antiguedad' },
];

function FilterChip({ label, active, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accent : colors.accentSoft,
        borderRadius: 999,
        minWidth: 96,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: active ? '#FFF' : colors.accent, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function FilterSection({ title, children, colors }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

export function ReportFilterBar({ filters, onChange, colors }) {
  return (
    <View style={{ gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Filtros operativos</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18 }}>
          Ajusta la lista por estado, jornada, asignacion y prioridad.
        </Text>
      </View>

      <FilterSection title="Estado" colors={colors}>
        {REPORT_STATUS_FILTERS.map((status) => (
          <FilterChip
            key={status}
            label={status === 'todos' ? 'Todos' : REPORT_STATUS_META[status]?.label}
            active={filters.status === status}
            onPress={() => onChange({ ...filters, status })}
            colors={colors}
          />
        ))}
      </FilterSection>

      <FilterSection title="Jornada" colors={colors}>
        {TIME_FILTERS.map((item) => (
          <FilterChip key={item.id} label={item.label} active={filters.time === item.id} onPress={() => onChange({ ...filters, time: item.id })} colors={colors} />
        ))}
      </FilterSection>

      <FilterSection title="Asignacion" colors={colors}>
        {ASSIGNMENT_FILTERS.map((item) => (
          <FilterChip key={item.id} label={item.label} active={filters.assignment === item.id} onPress={() => onChange({ ...filters, assignment: item.id })} colors={colors} />
        ))}
      </FilterSection>

      <FilterSection title="Orden" colors={colors}>
        {SORT_FILTERS.map((item) => (
          <FilterChip key={item.id} label={item.label} active={filters.sortBy === item.id} onPress={() => onChange({ ...filters, sortBy: item.id })} colors={colors} />
        ))}
      </FilterSection>

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Zona
        </Text>
        <TextInput
          value={filters.zone}
          onChangeText={(zone) => onChange({ ...filters, zone })}
          placeholder="Filtrar por zona"
          placeholderTextColor="#9EB0A4"
          style={{
            backgroundColor: '#F4FAF6',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 11,
            color: colors.text,
            fontSize: 13,
          }}
        />
      </View>
    </View>
  );
}
