import { UserProfile } from '@/types/user-profile.type';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, RadioButton, Snackbar, Text, TextInput } from 'react-native-paper';
import { getProfile, updateProfile } from './utils/db';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | undefined | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setName(p?.name || '');
    setGender(p?.gender || 'male');
    setHeight(p?.height?.toString() || '');
    setWeight(p?.weight?.toString() || '');
    setGoal(p?.goal || '');
  }, []);

  const handleUpdate = async () => {
    if (!name || !height || !weight) {
      setError('All fields are required.');
      return;
    }
    if (isNaN(Number(height)) || isNaN(Number(weight))) {
      setError('Height and weight must be numbers.');
      return;
    }
    if (!profile) {
      setError('Profile not loaded.');
      setSnackbar(true);
      return;
    }
    try {
      await updateProfile({ id: profile.id, name, gender, height: Number(height), weight: Number(weight), goal });
      setSnackbar(true);
    } catch (e) {
      setError('Failed to update profile.');
      setSnackbar(true);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text variant="titleLarge">Settings</Text>
      <TextInput label="Name" value={name} onChangeText={setName} style={{ marginBottom: 10 }} />
      <RadioButton.Group onValueChange={setGender} value={gender}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <RadioButton value="male" /><Text>Male</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 20 }}>
            <RadioButton value="female" /><Text>Female</Text>
          </View>
        </View>
      </RadioButton.Group>
      <TextInput label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" style={{ marginBottom: 10 }} />
      <TextInput label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" style={{ marginBottom: 10 }} />
      <TextInput label="Goal" value={goal} onChangeText={setGoal} style={{ marginBottom: 10 }} />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <Button mode="contained" onPress={handleUpdate}>Update</Button>
      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)}>{error || 'Profile updated!'}</Snackbar>
    </View>
  );
}
