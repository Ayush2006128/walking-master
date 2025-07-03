import React from "react";
import { Text, View } from "react-native";
import { useStepCounter } from "../utils/useStepCounter";

export default function StepCounterScreen() {
  const { stepCount, speed } = useStepCounter();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "bold" }}>Steps: {stepCount}</Text>
      <Text style={{ fontSize: 20, marginTop: 16 }}>
        Speed: {speed ? speed.toFixed(2) : "0.00"} m/s
      </Text>
    </View>
  );
}
