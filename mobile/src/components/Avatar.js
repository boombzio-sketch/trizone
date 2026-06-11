import { View, Text, Image, StyleSheet } from 'react-native'
import { C } from '../utils/theme'

export default function Avatar({ nickname, avatar_color, avatar_image, size = 36 }) {
  const color = avatar_color || C.accent
  const fs = Math.max(10, Math.round(size * 0.38))
  const radius = size / 2

  if (avatar_image) {
    return (
      <Image
        source={{ uri: avatar_image }}
        style={{ width: size, height: size, borderRadius: radius, borderWidth: 2, borderColor: color }}
      />
    )
  }

  return (
    <View style={[s.root, { width: size, height: size, borderRadius: radius, backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[s.char, { fontSize: fs, color }]}>{nickname?.charAt(0) || '?'}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  char: { fontWeight: '800' },
})
