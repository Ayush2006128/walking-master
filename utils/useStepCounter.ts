import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";

// Filtering constants
const ALPHA = 0.8;
const MIN_STEP_INTERVAL = 300; 
const THRESHOLD = 0.1;
const MAX_THRESHOLD = 0.4;
const MIN_GPS_SPEED = 0.0001;

export function useStepCounter() {
  const [stepCount, setStepCount] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isGpsEnabled, setIsGpsEnabled] = useState(false);
  const lastStepTime = useRef(0);
  const prevLow = useRef(0);
  const prevRaw = useRef(0);
  const prevHigh = useRef(0);
  const currentGpsSpeed = useRef(0);

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
    const timeOk = now - lastStepTime.current > MIN_STEP_INTERVAL;
    const magnitudeOk = filtered > THRESHOLD && filtered < MAX_THRESHOLD;
    const speedOk = isGpsEnabled ? gpsSpeed > MIN_GPS_SPEED : true; // Allow steps without GPS
    
    return timeOk && magnitudeOk && speedOk;
  };

  useEffect(() => {
    let accelSub: any = null;
    let locSub: any = null;

    // Setup GPS with better error handling
    const setupGPS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log("GPS Permission status:", status);
        
        if (status !== "granted") {
          console.log("GPS permission denied - step detection will work without GPS validation");
          setIsGpsEnabled(false);
          return;
        }

        locSub = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.Balanced, 
            distanceInterval: 1,
            timeInterval: 1000 // Update every second
          },
          (location) => {
            const newSpeed = location.coords.speed || 0;
            setSpeed(newSpeed);
            currentGpsSpeed.current = newSpeed;
            setIsGpsEnabled(true);
          }
        );
        
        console.log("GPS setup successful");
      } catch (error) {
        console.error("GPS setup failed:", error);
        setIsGpsEnabled(false);
      }
    };

    // Setup accelerometer with better error handling
    const setupAccelerometer = () => {
      try {
        accelSub = Accelerometer.addListener(({ x, y, z }) => {
          const mag = Math.sqrt(x**2 + y**2 + z**2);
          const lowPassFiltered = lowPass(mag);
          const highPassFiltered = highPass(lowPassFiltered);
          const now = Date.now();
          const gpsSpeedForStep = currentGpsSpeed.current;
          const valid = isValidStep(highPassFiltered, now, gpsSpeedForStep);
          if (valid) {
            lastStepTime.current = now;
            setStepCount((c) => c + 1);
          }
        });
        
        Accelerometer.setUpdateInterval(20); // 50Hz
        console.log("Accelerometer setup successful");
        
      } catch (error) {
        console.error("Accelerometer setup failed:", error);
      }
    };

    // Initialize both systems
    setupGPS();
    setupAccelerometer();

    return () => {
      if (accelSub) {
        accelSub.remove();
        console.log("Accelerometer listener removed");
      }
      if (locSub) {
        locSub.remove();
        console.log("GPS listener removed");
      }
    };
  }, []);

  return { stepCount, speed, isGpsEnabled };
}