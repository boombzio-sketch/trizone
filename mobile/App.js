import 'react-native-gesture-handler'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, ActivityIndicator, View, StyleSheet, TouchableOpacity } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './src/hooks/useAuth'
import { warmup } from './src/utils/api'
import LoginScreen   from './src/screens/LoginScreen'
import FeedScreen    from './src/screens/FeedScreen'
import WorkoutScreen from './src/screens/WorkoutScreen'
import RankingScreen from './src/screens/RankingScreen'
import ClubScreen    from './src/screens/ClubScreen'
import RaceScreen    from './src/screens/RaceScreen'
import MyScreen      from './src/screens/MyScreen'
import AdminScreen   from './src/screens/AdminScreen'
import { C } from './src/utils/theme'
import Avatar from './src/components/Avatar'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

function AppHeader() {
  const { user } = useAuth()
  const insets   = useSafeAreaInsets()
  const navigation = useNavigation()
  const avatarColor = user?.avatar_color || C.accent
  const canAdmin = user?.role === 'admin' || user?.can_approve

  return (
    <View style={[hdr.root, { paddingTop: insets.top }]}>
      {/* 로고 → 홈(피드)으로 이동 */}
      <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Feed' })}>
        <Text style={hdr.logo}>TRI<Text style={{ color: C.accent }}>ZONE</Text></Text>
      </TouchableOpacity>

      <View style={hdr.right}>
        {canAdmin && (
          <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={hdr.adminBtn}>
            <Text style={hdr.adminBtnText}>⚙️ 관리</Text>
          </TouchableOpacity>
        )}
        {/* 닉네임 → 마이페이지로 이동 */}
        <TouchableOpacity
          onPress={() => navigation.navigate('My')}
          style={[hdr.nickBtn, { backgroundColor: avatarColor + '20', borderColor: avatarColor + '70' }]}
        >
          <Avatar nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} size={26} />
          <Text style={hdr.nickText} numberOfLines={1}>{user?.nickname}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const hdr = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#0C1E38',
    borderBottomWidth: 1, borderBottomColor: 'rgba(56,189,248,0.12)',
  },
  logo: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBtn: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  adminBtnText: { fontSize: 12, fontWeight: '700', color: C.text2 },
  nickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 100, paddingVertical: 4, paddingLeft: 4, paddingRight: 10,
  },
  avatarDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarChar: { fontSize: 11, fontWeight: '800' },
  nickText: { fontSize: 13, fontWeight: '700', color: C.text, maxWidth: 80 },
})

const TABS = [
  { name: 'Feed',    icon: '⚡', label: '피드',  component: FeedScreen,    activeColor: C.accent },
  { name: 'Ranking', icon: '🏆', label: '랭킹',  component: RankingScreen, activeColor: C.accent },
  { name: 'Club',    icon: '👥', label: '클럽',  component: ClubScreen,    activeColor: '#A855F7' },
  { name: 'Race',    icon: '🏁', label: '대회',  component: RaceScreen,    activeColor: C.accent },
]

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name)
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 0,
            paddingTop: 0,
          },
          tabBarInactiveTintColor: C.text2,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
          tabBarIconStyle: { marginTop: 6 },
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ position: 'absolute', top: -8, width: 32, height: 2, backgroundColor: tab?.activeColor, borderRadius: 1 }} />}
              <Text style={{ fontSize: 20 }}>{tab?.icon}</Text>
            </View>
          ),
          tabBarActiveTintColor: tab?.activeColor,
          tabBarLabel: tab?.label,
        }
      }}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  )
}

function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />
      <MainTabs />
    </View>
  )
}

function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainLayout} />
          <Stack.Screen name="Admin"    component={AdminScreen} />
          <Stack.Screen name="My"       component={MyScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  useEffect(() => { warmup() }, [])
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
