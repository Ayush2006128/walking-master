import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getProfile } from "./utils/db";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        if (!profile) {
          router.replace("../profile");
        } else if (!profile.goal) {
          router.replace("../goal");
        } else {
          router.replace("../step-counter");
        }
      } catch (e) {
        router.replace("../profile");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
