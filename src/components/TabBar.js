import { Pressable, Text, View, Image } from 'react-native';
import { getTheme } from '../styles/appStyles';
import homeIcon from '../../assets/TabBarIcons/home.png';
import mapIcon from '../../assets/TabBarIcons/map.png';
import rewardsIcon from '../../assets/TabBarIcons/rewards.png';
import profileIcon from '../../assets/TabBarIcons/profile.png';

const TAB_ICONS = {
  home:    { active: homeIcon, inactive: homeIcon },
  map:     { active: mapIcon, inactive: mapIcon },
  rewards: { active: rewardsIcon, inactive: rewardsIcon },
  reports: { active: mapIcon, inactive: mapIcon },
  profile: { active: profileIcon, inactive: profileIcon },
};

const TAB_LABELS = {
  home:    'Inicio',
  map:     'Mapa',
  rewards: 'Recompensas',
  reports: 'Reportes',
  profile: 'Perfil',
};

export function TabBar({ tabs, activeTab, onTabPress }) {
  const isDark = false;
  const t = getTheme(isDark);

  const bg     = isDark ? '#182820' : '#FFFFFF';
  const border  = isDark ? '#2A4035' : '#E2EDE6';
  const accent  = t.accent;
  const inactive = isDark ? '#4A6858' : '#9AA49F';
  const activeBg = isDark ? '#1E3828' : '#EBF9F1';

  return (
    <View style={{
      position: 'absolute',
      left: 12, right: 12, bottom: 10,
      flexDirection: 'row',
      backgroundColor: bg,
      borderRadius: 28,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: border,
      shadowColor: isDark ? '#000' : '#294335',
      shadowOpacity: isDark ? 0.5 : 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
      <Pressable
       key={tab.id}
       onPress={() => onTabPress(tab.id)}
       style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isActive ? activeBg : 'transparent',
        gap: 3,
        opacity: pressed ? 0.7 : 1,
  })}
>

  <Image 
    source={TAB_ICONS[tab.id].active} 
    style={{ 
      width: 24, 
      height: 24, 
      tintColor: isActive ? accent : inactive 
    }} 
  />
  
  <Text style={{
    fontSize: 10,
    fontWeight: isActive ? '800' : '600',
    color: isActive ? accent : inactive,
  }}>
    {TAB_LABELS[tab.id] || tab.label}
  </Text>

  {isActive && (
    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
     )}
    </Pressable>
        );
      })}
    </View>
  );
}
