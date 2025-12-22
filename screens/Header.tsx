import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from './Projects/Project/Project.styles';

export default function Header({
  user,
  action, // <-- nowy props
}: {
  user: { name: string; plan: string; avatar: string | null };
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.avatarWrap}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={26} color="#222" />
          </View>
        )}
      </View>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userPlan}>{user.plan}</Text>
      </View>
      {action}
    </View>
  );
}
