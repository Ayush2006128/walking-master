import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";

// Filtering constants
const ALPHA = 0.8;
const MIN_STEP_INTERVAL = 300; // ms
const THRESHOLD = 1.0; // Lowered for debugging, revert if needed
const MAX_THRESHOLD = 4.0; // Increased for debugging, revert if needed
const MIN_GPS_SPEED = 0.1; // Lowered for debugging, revert if needed

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
    // Always log validation details for debugging
    console.log("Step validation:", { 
      filtered: filtered.toFixed(3), 
      timeOk, 
      magnitudeOk, 
      speedOk, 
      gpsSpeed: gpsSpeed.toFixed(3),
      isGpsEnabled 
    });
    
    return timeOk && magnitudeOk && speedOk;
  };

  useEffect(() => {
    let accelSub: any = null;
    let locSub: any = null;
    let debugInterval: number;

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
            
            // Log GPS updates occasionally
            if (Math.random() < 0.1) {
              console.log("GPS Speed updated:", newSpeed.toFixed(3), "m/s");
            }
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
          const filtered = highPass(lowPass(mag));
          const now = Date.now();
          const gpsSpeedForStep = currentGpsSpeed.current;
          const valid = isValidStep(filtered, now, gpsSpeedForStep);
          if (gpsSpeedForStep > 0.1 && (filtered > 1.0) && (filtered < 4.0)) {
            lastStepTime.current = now;
            setStepCount((c) => c + 1);
          }
          // Debug log
          console.log("Step debug:", {
            mag,
            filtered,
            gpsSpeed: gpsSpeedForStep,
            valid,
            stepCount: stepCount,
          });
        });
        
        Accelerometer.setUpdateInterval(20); // 50Hz
        console.log("Accelerometer setup successful");
        
        // Debug interval to show we're alive
        debugInterval = setInterval(() => {
          console.log("Step counter status:", {
            stepCount,
            speed: speed.toFixed(3),
            isGpsEnabled,
            lastStepTime: lastStepTime.current
          });
        }, 10000); // Every 10 seconds
        
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
      if (debugInterval) {
        clearInterval(debugInterval);
      }
    };
  }, []);

  return { stepCount, speed, isGpsEnabled };
}