import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar, Button, Card, Snackbar, Text } from 'react-native-paper';
import { getProfile } from './utils/db';

interface Profile {
    name: string;
    weight: number | string;
    height: number | string;
    goal: string;
    gender: 'male' | 'female' | string;
}

function calculateBMI(weight: number | string, height: number | string): string {
    // height in cm, weight in kg
    const h = Number(height) / 100;
    return (Number(weight) / (h * h)).toFixed(1);
}

import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  settings: undefined;
  // add other routes here if needed
};

interface StepCounterScreenProps {
  navigation: StackNavigationProp<RootStackParamList, 'settings'>;
}

export default function StepCounterScreen({ navigation }: StepCounterScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [steps, setSteps] = useState(0);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(false);
  const [subscription, setSubscription] = useState<null | { remove: () => void }>(null);
  const [lastAccel, setLastAccel] = useState({ x: 0, y: 0, z: 0 });
  const [lastStepTime, setLastStepTime] = useState(Date.now());

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setProfile({
        ...profile,
        goal: profile.goal ?? '',
      });
    }
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setSnackbar(true);
      }
    })();
    const sub = Accelerometer.addListener(accel => {
      const threshold = 1.2; // tune for sensitivity
      const now = Date.now();
      const delta = Math.abs(accel.x - lastAccel.x) + Math.abs(accel.y - lastAccel.y) + Math.abs(accel.z - lastAccel.z);
      if (delta > threshold && now - lastStepTime > 300) {
        setSteps(s => s + 1);
        setLastStepTime(now);
      }
      setLastAccel(accel);
    });
    setSubscription(sub);
    return () => sub && sub.remove();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {profile && (
        <Card style={{ marginBottom: 20 }}>
          <Card.Title
            title={profile.name}
            subtitle={`BMI: ${calculateBMI(profile.weight, profile.height)} | Goal: ${profile.goal}`}
            left={props => <Avatar.Icon {...props} icon={profile.gender === 'male' ? 'account' : 'account-outline'} />}
          />
        </Card>
      )}
      <Card>
        <Card.Content>
          <Text variant="headlineLarge">Steps: {steps}</Text>
        </Card.Content>
      </Card>
      <Button mode="outlined" style={{ marginTop: 20 }} onPress={() => navigation.navigate('settings')}>Settings</Button>
      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)}>{error}</Snackbar>
    </View>
  );
}
