import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, RadioButton, Snackbar, Text } from 'react-native-paper';
import { getProfile, updateProfile } from '../utils/db';

const goals = [
  'Lose weight',
  'Stay fit',
  'Gain muscle',
  'Improve endurance',
];

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  'step-counter': undefined;
  // add other routes if needed
};

type GoalScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'step-counter'>;
};

export default function GoalScreen({ navigation }: GoalScreenProps) {
  const [goal, setGoal] = useState(goals[0]);
  const [snackbar, setSnackbar] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    try {
      const profile = await getProfile();
      if (
        profile &&
        typeof profile.name === 'string' &&
        typeof profile.gender === 'string' &&
        typeof profile.height === 'number' &&
        typeof profile.weight === 'number'
      ) {
        await updateProfile({
          id: profile.id,
          name: profile.name,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          goal,
        });
        navigation.replace('step-counter');
      } else {
        throw new Error('Incomplete profile data.');
      }
    } catch (e) {
      setError('Failed to save goal.');
      setSnackbar(true);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text variant="titleLarge">Select Your Goal</Text>
      <RadioButton.Group onValueChange={setGoal} value={goal}>
        {goals.map(g => (
          <View key={g} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <RadioButton value={g} />
            <Text>{g}</Text>
          </View>
        ))}
      </RadioButton.Group>
      <Button mode="contained" onPress={handleContinue}>Continue</Button>
      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)}>{error}</Snackbar>
    </View>
  );
}
