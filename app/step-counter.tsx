import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Avatar, Button, Card, ProgressBar, Snackbar, Text, useTheme } from 'react-native-paper';
import { getProfile } from '../utils/db';

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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [speed, setSpeed] = useState(0);
  const theme = useTheme();

  // Animated step count
  const animatedSteps = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedSteps, {
      toValue: steps,
      duration: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [steps]);

  // Calculate progress
  let goal = 10000;
  if (profile?.goal && !isNaN(Number(profile.goal)) && Number(profile.goal) > 0) {
    goal = Number(profile.goal);
  }
  const progress = Math.min(steps / goal, 1);

  // Retry permission
  const requestPermission = async () => {
    setError('');
    setSnackbar(false);
    setPermissionDenied(false);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Please enable it in settings.');
      setSnackbar(true);
      setPermissionDenied(true);
    } else {
      setPermissionDenied(false);
      setSnackbar(false);
    }
  };

  // For improved step detection
  const [zHistory, setZHistory] = useState<number[]>([]);
  const windowSize = 10; // moving average window
  const stepThreshold = 1.0; // tune for sensitivity

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
        setError('Location permission denied. Please enable it in settings.');
        setSnackbar(true);
        setPermissionDenied(true);
      }
    })();
    // Start GPS watcher
    let locationSub: Location.LocationSubscription | undefined;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        setSpeed(loc.coords.speed || 0);
      }
    ).then(sub => { locationSub = sub; }).catch(() => {});
    let sub: { remove: () => void } | undefined;
    try {
      sub = Accelerometer.addListener(accel => {
        // Improved step detection: use z-axis peak detection with moving average
        const now = Date.now();
        setZHistory(prev => {
          const newHistory = [...prev, accel.z].slice(-windowSize);
          // Calculate moving average
          const avg = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
          // Detect peak: current z is significantly higher than average and last step was >300ms ago
          if (
            newHistory.length === windowSize &&
            accel.z - avg > stepThreshold &&
            now - lastStepTime > 300 &&
            speed > 0.5 // Only count step if user is moving
          ) {
            setSteps(s => s + 1);
            setLastStepTime(now);
          }
          return newHistory;
        });
      });
      setSubscription(sub);
    } catch (e) {
      setSensorAvailable(false);
      setError('Accelerometer not available on this device.');
      setSnackbar(true);
    }
    return () => {
      if (sub) sub.remove();
      if (locationSub) locationSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Daily summary (mocked for now)
  const distance = (steps * 0.0008).toFixed(2); // ~0.8m per step
  const calories = (steps * 0.04).toFixed(0); // ~0.04 kcal per step

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', backgroundColor: theme.colors.background }}>
      {profile && (
        <Card style={{ marginBottom: 20 }}>
          <Card.Title
            title={profile.name}
            subtitle={`BMI: ${calculateBMI(profile.weight, profile.height)} | Goal: ${profile.goal}`}
            left={props => (
              <Avatar.Text {...props} label={getInitials(profile.name)} />
            )}
          />
        </Card>
      )}
      <Card style={{ marginBottom: 20 }}>
        <Card.Content style={{ alignItems: 'center' }}>
          <Text variant="headlineLarge" style={{ marginBottom: 10 }}>Steps</Text>
          {goal > 0 ? (
            <Animated.Text style={{ fontSize: 48, fontWeight: 'bold', color: theme.colors.primary }}>
              {animatedSteps.interpolate({
                inputRange: [0, goal],
                outputRange: [0, goal],
                extrapolate: 'clamp',
              })}
            </Animated.Text>
          ) : (
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: theme.colors.primary }}>0</Text>
          )}
          <ProgressBar progress={progress} color={theme.colors.primary} style={{ height: 10, width: '100%', marginTop: 10, borderRadius: 5 }} />
          <Text style={{ marginTop: 8 }}>{steps} / {goal} steps</Text>
        </Card.Content>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <Card.Content>
          <Text variant="titleMedium">Today's Summary</Text>
          <Text>Distance: {distance} km</Text>
          <Text>Calories: {calories} kcal</Text>
        </Card.Content>
      </Card>
      <Button mode="outlined" style={{ marginTop: 10 }} onPress={() => navigation.navigate('settings')}>Settings</Button>
      <Snackbar
        visible={snackbar}
        onDismiss={() => setSnackbar(false)}
        action={permissionDenied ? { label: 'Retry', onPress: requestPermission } : undefined}
        duration={6000}
      >
        {error}
      </Snackbar>
    </View>
  );
}
