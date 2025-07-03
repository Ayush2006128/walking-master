import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";

// Filtering constants
const ALPHA = 0.8;
const MIN_STEP_INTERVAL = 300; // ms
const THRESHOLD = 1.2; // Calibrate as needed
const MAX_THRESHOLD = 3.0;
const MIN_GPS_SPEED = 0.5; // m/s

export function useStepCounter() {
  const [stepCount, setStepCount] = useState(0);
  const [speed, setSpeed] = useState(0);
  const lastStepTime = useRef(0);
  const prevLow = useRef(0);
  const prevRaw = useRef(0);
  const prevHigh = useRef(0);

  // Low-pass filter
  const lowPass = (value: number) => {
    prevLow.current = ALPHA * prevLow.current + (1 - ALPHA) * value;
    return prevLow.current;
  };

  // High-pass filter
  const highPass = (value: number) => {
    const high = ALPHA * (prevHigh.current + value - prevRaw.current);
    prevRaw.current = value;
    prevHigh.current = high;
    return high;
  };

  // Step validation
  const isValidStep = (filtered: number, now: number, gpsSpeed: number) => {
    return (
      filtered > THRESHOLD &&
      filtered < MAX_THRESHOLD &&
      now - lastStepTime.current > MIN_STEP_INTERVAL &&
      gpsSpeed > MIN_GPS_SPEED
    );
  };

  useEffect(() => {
    let accelSub: any = null;
    let locSub: any = null;
    let currentGpsSpeed = 0;

    // Listen to GPS
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      locSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 1 },
        (location) => {
          setSpeed(location.coords.speed || 0);
          currentGpsSpeed = location.coords.speed || 0;
        }
      );
    })();

    // Listen to accelerometer
    accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x**2 + y**2 + z**2);
      const filtered = highPass(lowPass(mag));
      const now = Date.now();
      if (isValidStep(filtered, now, currentGpsSpeed)) {
        lastStepTime.current = now;
        setStepCount((c) => c + 1);
      }
    });
    Accelerometer.setUpdateInterval(20); // 50Hz

    return () => {
      accelSub && accelSub.remove();
      locSub && locSub.remove();
    };
  }, []);

  return { stepCount, speed };
} 