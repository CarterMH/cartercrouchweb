const clockEl = document.getElementById("clock");
const dateEl = document.getElementById("date");
const tzEl = document.getElementById("timezone");
const syncStatusEl = document.getElementById("syncStatus");
const offsetEl = document.getElementById("offset");
const lastSyncEl = document.getElementById("lastSync");
const driftEl = document.getElementById("drift");
const alarmTimeEl = document.getElementById("alarmTime");
const armBtn = document.getElementById("armBtn");
const stopBtn = document.getElementById("stopBtn");
const nextAlarmEl = document.getElementById("nextAlarm");
const intensityEl = document.getElementById("intensity");
const audioHintEl = document.getElementById("audioHint");
const timezoneSelectEl = document.getElementById("timezoneSelect");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const state = {
  offsetMs: 0,
  lastSync: null,
  driftMs: 0,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  alarm: {
    armed: false,
    nextAt: null,
    fired: false,
  },
  audio: {
    context: null,
    nodes: [],
  },
};

const timeApis = [
  "https://worldtimeapi.org/api/ip",
  "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
];

const formatterCache = new Map();

function getFormatter(key, options) {
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(undefined, options));
  }
  return formatterCache.get(key);
}

function formatTime(date, timeZone) {
  const formatter = getFormatter(`time-${timeZone}`, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  });
  return formatter.format(date);
}

function formatDate(date, timeZone) {
  const formatter = getFormatter(`date-${timeZone}`, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
  return formatter.format(date);
}

function formatNextAlarm(date, timeZone) {
  const formatter = getFormatter(`alarm-${timeZone}`, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
    timeZone,
  });
  return formatter.format(date);
}

function getTimeZoneParts(date, timeZone) {
  const formatter = getFormatter(`parts-${timeZone}`, {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  });
  const parts = formatter.formatToParts(date);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  });
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  const utcFromParts = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return utcFromParts - date.getTime();
}

function zonedTimeToUtcMs(parts, timeZone) {
  const approxUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const offset1 = getTimeZoneOffsetMs(new Date(approxUtc), timeZone);
  const utc1 = approxUtc - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(utc1), timeZone);
  return approxUtc - offset2;
}

function getZonedDateParts(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function addZonedDays(dateParts, timeZone, days) {
  const utcNoon = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 12, 0, 0);
  const shifted = new Date(utcNoon + days * 24 * 60 * 60 * 1000);
  return getZonedDateParts(shifted, timeZone);
}

function setSyncStatus(text) {
  syncStatusEl.textContent = text;
}

async function fetchAtomicTime() {
  for (const url of timeApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const start = performance.now();
      const response = await fetch(url, { signal: controller.signal });
      const json = await response.json();
      const end = performance.now();
      clearTimeout(timeoutId);

      let utcMs = null;
      if (json.unixtime) {
        utcMs = json.unixtime * 1000;
      } else if (json.dateTime) {
        utcMs = Date.parse(json.dateTime + "Z");
      } else if (json.datetime) {
        utcMs = Date.parse(json.datetime);
      }

      if (!utcMs) {
        throw new Error("Unsupported time response");
      }

      const rtt = end - start;
      const approxLocalAtResponse = Date.now() + rtt / 2;
      return {
        utcMs,
        rtt,
        approxLocalAtResponse,
      };
    } catch (error) {
      continue;
    }
  }

  throw new Error("All time sync sources failed");
}

async function syncTime() {
  setSyncStatus("Syncing to atomic time...");
  try {
    const result = await fetchAtomicTime();
    const newOffset = result.utcMs - result.approxLocalAtResponse;
    state.driftMs = Math.abs(newOffset - state.offsetMs);
    state.offsetMs = newOffset;
    state.lastSync = new Date();
    offsetEl.textContent = `${Math.round(state.offsetMs)} ms`;
    lastSyncEl.textContent = state.lastSync.toLocaleTimeString();
    driftEl.textContent = `${Math.round(state.driftMs)} ms`;
    setSyncStatus("Synced to atomic time");
  } catch (error) {
    setSyncStatus("Offline: using device time");
    lastSyncEl.textContent = "--";
    driftEl.textContent = "--";
  }
}

function getCorrectedTime() {
  return new Date(Date.now() + state.offsetMs);
}

function updateClock() {
  const now = getCorrectedTime();
  clockEl.textContent = formatTime(now, state.timeZone);
  dateEl.textContent = formatDate(now, state.timeZone);
  tzEl.textContent = state.timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone
    ? `Local: ${state.timeZone}`
    : state.timeZone;

  if (state.alarm.armed && state.alarm.nextAt) {
    if (!state.alarm.fired && now.getTime() >= state.alarm.nextAt.getTime()) {
      triggerAlarm();
    }
  }
}

function parseAlarmInput(value, now, timeZone) {
  if (!value) return null;
  const parts = value.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || 0);
  const seconds = Number(parts[2] || 0);

  const nowParts = getTimeZoneParts(now, timeZone);
  let targetDate = {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
  };

  const alarmParts = {
    year: targetDate.year,
    month: targetDate.month,
    day: targetDate.day,
    hour: hours,
    minute: minutes,
    second: seconds,
  };
  const nowTotalSeconds =
    nowParts.hour * 3600 + nowParts.minute * 60 + nowParts.second;
  const alarmTotalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (alarmTotalSeconds <= nowTotalSeconds) {
    targetDate = addZonedDays(targetDate, timeZone, 1);
  }

  const finalParts = {
    year: targetDate.year,
    month: targetDate.month,
    day: targetDate.day,
    hour: hours,
    minute: minutes,
    second: seconds,
  };

  return new Date(zonedTimeToUtcMs(finalParts, timeZone));
}

function ensureAudio() {
  if (state.audio.context) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  state.audio.context = new AudioContext();
  audioHintEl.textContent = "Audio unlocked.";
}

function buildNoise(context, duration) {
  const bufferSize = context.sampleRate * duration;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  return noise;
}

function triggerAlarm() {
  state.alarm.fired = true;
  document.body.classList.add("alarm-on");

  ensureAudio();
  const context = state.audio.context;
  if (!context) return;
  context.resume();

  const intensity = Number(intensityEl.value);
  const master = context.createGain();
  master.gain.value = intensity;
  master.connect(context.destination);

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-30, context.currentTime);
  compressor.knee.setValueAtTime(20, context.currentTime);
  compressor.ratio.setValueAtTime(12, context.currentTime);
  compressor.attack.setValueAtTime(0.005, context.currentTime);
  compressor.release.setValueAtTime(0.2, context.currentTime);
  compressor.connect(master);

  const osc1 = context.createOscillator();
  const osc2 = context.createOscillator();
  const osc3 = context.createOscillator();
  osc1.type = "sawtooth";
  osc2.type = "square";
  osc3.type = "triangle";
  osc1.frequency.value = 880;
  osc2.frequency.value = 1320;
  osc3.frequency.value = 220;

  const noise = buildNoise(context, 2);

  osc1.connect(compressor);
  osc2.connect(compressor);
  osc3.connect(compressor);
  noise.connect(compressor);

  osc1.start();
  osc2.start();
  osc3.start();
  noise.start();

  state.audio.nodes = [osc1, osc2, osc3, noise, master, compressor];
}

function stopAlarm() {
  document.body.classList.remove("alarm-on");
  if (state.audio.nodes.length) {
    state.audio.nodes.forEach((node) => {
      try {
        node.stop?.();
      } catch (error) {
        // ignore
      }
      try {
        node.disconnect?.();
      } catch (error) {
        // ignore
      }
    });
  }
  state.audio.nodes = [];
  state.alarm.armed = false;
  state.alarm.fired = false;
  state.alarm.nextAt = null;
  nextAlarmEl.textContent = "No alarm set.";
}

function scheduleAlarm() {
  const now = getCorrectedTime();
  const nextAlarm = parseAlarmInput(alarmTimeEl.value, now, state.timeZone);
  if (!nextAlarm) {
    nextAlarmEl.textContent = "Pick a time first.";
    return;
  }
  state.alarm.armed = true;
  state.alarm.fired = false;
  state.alarm.nextAt = nextAlarm;
  nextAlarmEl.textContent = `Next alarm: ${formatNextAlarm(nextAlarm, state.timeZone)}`;
}

armBtn.addEventListener("click", () => {
  ensureAudio();
  scheduleAlarm();
});

stopBtn.addEventListener("click", () => {
  stopAlarm();
});

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  document.body.classList.toggle("fullscreen-active", isFullscreen);
  fullscreenBtn.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
});

function buildTimeZoneOptions() {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [
          "UTC",
          "America/New_York",
          "America/Chicago",
          "America/Denver",
          "America/Los_Angeles",
          "Europe/London",
          "Europe/Paris",
          "Asia/Tokyo",
          "Asia/Shanghai",
          "Australia/Sydney",
        ];

  timezoneSelectEl.innerHTML = "";
  zones.forEach((zone) => {
    const option = document.createElement("option");
    option.value = zone;
    option.textContent = zone;
    timezoneSelectEl.appendChild(option);
  });
  timezoneSelectEl.value = state.timeZone;
}

timezoneSelectEl.addEventListener("change", () => {
  state.timeZone = timezoneSelectEl.value;
  if (state.alarm.armed) {
    scheduleAlarm();
  } else {
    nextAlarmEl.textContent = "No alarm set.";
  }
  updateClock();
});

buildTimeZoneOptions();
syncTime();
setInterval(syncTime, 10 * 60 * 1000);
setInterval(updateClock, 200);
updateClock();
