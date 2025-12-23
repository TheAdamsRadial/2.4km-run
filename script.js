const TOTAL_DISTANCE = 2400; // meters
const CALLOUT_INTERVAL = 200; // meters
const PACE_TOLERANCE = 3; // seconds

let targetSeconds = 0;
let startTime = null;
let watchId = null;

let lastPosition = null;
let distanceCovered = 0;
let nextCallout = TOTAL_DISTANCE - CALLOUT_INTERVAL;

function parseTargetTime() {
  const val = document.getElementById("targetTime").value;
  const [m, s] = val.split(":").map(Number);
  return (m * 60) + s;
}

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  speechSynthesis.speak(msg);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function start() {
  targetSeconds = parseTargetTime();
  if (!targetSeconds) return;

  startTime = Date.now();
  distanceCovered = 0;
  lastPosition = null;
  nextCallout = TOTAL_DISTANCE - CALLOUT_INTERVAL;

  speak("Run started");

  watchId = navigator.geolocation.watchPosition(
    onPosition,
    err => console.error(err),
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000
    }
  );
}

function onPosition(pos) {
  const { latitude, longitude } = pos.coords;

  if (lastPosition) {
    const d = haversine(
      lastPosition.lat,
      lastPosition.lon,
      latitude,
      longitude
    );
    distanceCovered += d;
  }

  lastPosition = { lat: latitude, lon: longitude };

  const elapsed = (Date.now() - startTime) / 1000;
  document.getElementById("timer").textContent = formatTime(elapsed);

  const remaining = TOTAL_DISTANCE - distanceCovered;

  if (remaining <= nextCallout && nextCallout > 0) {
    callout(nextCallout, elapsed);
    nextCallout -= CALLOUT_INTERVAL;
  }

  if (remaining <= 0) {
    speak("Two point four kilometers complete");
    stop();
  }
}

function callout(remainingMeters, elapsed) {
  const expectedTime =
    ((TOTAL_DISTANCE - remainingMeters) / TOTAL_DISTANCE) * targetSeconds;

  const delta = Math.round(expectedTime - elapsed);

  speak(`${remainingMeters} meters remaining`);

  if (Math.abs(delta) <= PACE_TOLERANCE) {
    speak("Pace good");
  } else if (delta > 0) {
    speak(`Slow down ${delta} seconds`);
  } else {
    speak(`Speed up ${Math.abs(delta)} seconds`);
  }
}

function stop() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function reset() {
  stop();
  document.getElementById("timer").textContent = "00:00";
}
