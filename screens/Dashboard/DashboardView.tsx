import React from 'react';
import { Text, View } from 'react-native';
import MainView from '../MainView';
import { styles } from './dashboard.styles';

export default function DashboardView() {
  return (
    <MainView>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
      </View>
    </MainView>
  );
}
