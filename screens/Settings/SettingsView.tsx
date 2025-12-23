import React from 'react';
import { Text, View } from 'react-native';
import MainView from '../MainView';
import { styles } from './settings.styles';

export default function SettingsView() {
  return (
    <MainView user={{ name: 'Taaniel', plan: 'Free', avatar: null }}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
      </View>
    </MainView>
  );
}
