document.addEventListener('DOMContentLoaded', () => {
  // Timer State
  let currentMode = 'focus';
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let timerInterval = null;
  let isRunning = false;

  // Audio Context State
  let audioCtx = null;
  let currentSoundNode = null;
  let masterGain = null;
  let isSoundPlaying = false;
  let activeSoundPreset = 'rain';

  // Elements
  const digitsEl = document.getElementById('timerDigits');
  const labelEl = document.getElementById('timerStatusLabel');
  const circleEl = document.getElementById('timerProgressCircle');
  const startBtn = document.getElementById('startPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const modeBtns = document.querySelectorAll('.pomo-mode-btn');
  const minusFiveBtn = document.getElementById('minusFiveBtn');
  const plusFiveBtn = document.getElementById('plusFiveBtn');

  const soundBtns = document.querySelectorAll('.ambient-choice-btn');
  const toggleSoundBtn = document.getElementById('toggleAmbientBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const soundWave = document.getElementById('soundWaveAnim');
  const triggerCertBtn = document.getElementById('triggerCertBtn');

  // Stats Elements
  const pomoStreakEl = document.getElementById('statPomoStreak');
  const pomoSessionsEl = document.getElementById('statPomoSessions');
  const pomoMinutesEl = document.getElementById('statPomoMinutes');
  const navStreakEl = document.getElementById('navPomodoroStreak');

  const CIRCLE_CIRCUMFERENCE = 660; // 2 * PI * 105

  // Modes definition
  const MODES = {
    focus: { time: 25 * 60, label: 'DEEP FOCUS', stroke: '#ef4444' },
    shortBreak: { time: 5 * 60, label: 'SHORT BREAK', stroke: '#10b981' },
    longBreak: { time: 15 * 60, label: 'LONG BREAK', stroke: '#3b82f6' }
  };

  // Format MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Update timer display & SVG circle
  function updateDisplay() {
    if (digitsEl) digitsEl.textContent = formatTime(remainingSeconds);
    document.title = `${formatTime(remainingSeconds)} - ${currentMode === 'focus' ? '🍅 Focus' : '☕ Break'}`;

    if (circleEl) {
      const progress = (totalSeconds - remainingSeconds) / totalSeconds;
      const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
      circleEl.style.strokeDashoffset = offset;
      circleEl.style.stroke = MODES[currentMode].stroke;
    }
  }

  // Set mode
  function setMode(modeKey) {
    currentMode = modeKey;
    pauseTimer();
    totalSeconds = MODES[modeKey].time;
    remainingSeconds = totalSeconds;
    if (labelEl) {
      labelEl.textContent = MODES[modeKey].label;
      labelEl.style.color = MODES[modeKey].stroke;
    }
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeKey);
    });
    updateDisplay();
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Start / Pause
  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.textContent = '⏸️ Pause';
    startBtn.style.background = '#f59e0b';

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        updateDisplay();
      } else {
        handleTimerComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    if (startBtn) {
      startBtn.textContent = currentMode === 'focus' ? '▶️ Start Focus' : '▶️ Start Break';
      startBtn.style.background = currentMode === 'focus' ? '#ef4444' : '#10b981';
    }
  }

  startBtn.addEventListener('click', () => {
    if (isRunning) pauseTimer();
    else startTimer();
  });

  resetBtn.addEventListener('click', () => {
    pauseTimer();
    remainingSeconds = totalSeconds;
    updateDisplay();
  });

  if (minusFiveBtn) {
    minusFiveBtn.addEventListener('click', () => {
      if (remainingSeconds > 300) {
        remainingSeconds -= 300;
        totalSeconds = Math.max(300, totalSeconds - 300);
        updateDisplay();
      }
    });
  }

  if (plusFiveBtn) {
    plusFiveBtn.addEventListener('click', () => {
      remainingSeconds += 300;
      totalSeconds += 300;
      updateDisplay();
    });
  }

  // Timer complete handler
  function handleTimerComplete() {
    pauseTimer();
    playCompletionChime();

    if (currentMode === 'focus') {
      const minutesCompleted = Math.round(totalSeconds / 60);
      logCompletedSession(minutesCompleted);
      alert('🎉 Fantastic focus session completed! Your streak has been updated. Take a well-deserved break!');
      setMode('shortBreak');
    } else {
      alert('☕ Break is over! Ready to focus again?');
      setMode('focus');
    }
  }

  // Play gentle web audio chime
  function playCompletionChime() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.log('Chime audio error:', e);
    }
  }

  // Log session to server via POST /api/pomodoro/complete
  async function logCompletedSession(durationMinutes) {
    try {
      const res = await fetch('/api/pomodoro/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: durationMinutes })
      });
      const data = await res.json();
      if (data.success && data.pomodoro) {
        if (pomoStreakEl) pomoStreakEl.textContent = `${data.pomodoro.currentStreak}d`;
        if (pomoSessionsEl) pomoSessionsEl.textContent = data.pomodoro.totalSessions;
        if (pomoMinutesEl) pomoMinutesEl.textContent = `${data.pomodoro.totalMinutes}m`;
        if (navStreakEl) navStreakEl.textContent = `${data.pomodoro.currentStreak} Day Focus Streak`;
      }
    } catch (err) {
      console.error('Failed to log pomodoro session:', err);
    }
  }

  // -------------------------------------------------------------
  // Web Audio Synthesizer for Focusing Ambient Soundscapes
  // -------------------------------------------------------------
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(volumeSlider ? parseFloat(volumeSlider.value) : 0.5, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function stopAmbientSound() {
    if (currentSoundNode) {
      try {
        if (currentSoundNode.stop) currentSoundNode.stop();
        if (currentSoundNode.disconnect) currentSoundNode.disconnect();
      } catch (e) {}
      currentSoundNode = null;
    }
    isSoundPlaying = false;
    if (toggleSoundBtn) {
      toggleSoundBtn.textContent = '▶️ Play Soundscape';
      toggleSoundBtn.style.background = '#4f46e5';
    }
    if (soundWave) soundWave.style.display = 'none';
  }

  function startAmbientSound(preset) {
    stopAmbientSound();
    const ctx = getAudioContext();

    if (preset === 'rain') {
      currentSoundNode = createRainSound(ctx);
    } else if (preset === 'waves') {
      currentSoundNode = createOceanWavesSound(ctx);
    } else if (preset === 'brown') {
      currentSoundNode = createBrownNoiseSound(ctx);
    } else if (preset === 'lofi') {
      currentSoundNode = createLoFiChordsSound(ctx);
    } else if (preset === 'coffee') {
      currentSoundNode = createCoffeeShopSound(ctx);
    } else if (preset === 'forest') {
      currentSoundNode = createForestSound(ctx);
    }

    if (currentSoundNode) {
      currentSoundNode.connect(masterGain);
      isSoundPlaying = true;
      if (toggleSoundBtn) {
        toggleSoundBtn.textContent = '⏸️ Pause Soundscape';
        toggleSoundBtn.style.background = '#059669';
      }
      if (soundWave) soundWave.style.display = 'flex';
    }
  }

  // 1. Rain Synthesizer (Filtered noise + gentle high-pass droplet filter)
  function createRainSound(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.1;
      b2 = 0.86 * b2 + white * 0.3;
      data[i] = (b0 + b1 + b2) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    noise.connect(filter);
    noise.start();
    return filter;
  }

  // 2. Ocean Waves (Modulated Lowpass White Noise)
  function createOceanWavesSound(ctx) {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    // LFO to swell wave volume
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period
    lfoGain.gain.setValueAtTime(250, ctx.currentTime);
    lfo.connect(filter.frequency);
    lfo.start();

    noise.connect(filter);
    noise.start();
    return filter;
  }

  // 3. Brown Noise (Warm Deep Focus)
  function createBrownNoiseSound(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    return noise;
  }

  // 4. Lo-Fi Study Chords (Detuned warm triad pad)
  function createLoFiChordsSound(ctx) {
    const merger = ctx.createGain();
    merger.gain.setValueAtTime(0.15, ctx.currentTime);

    const freqs = [261.63, 329.63, 392.00, 493.88]; // Cmaj7
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      osc.connect(filter);
      filter.connect(merger);
      osc.start();
    });

    return merger;
  }

  // 5. Cozy Coffee Shop
  function createCoffeeShopSound(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    noise.connect(filter);
    noise.start();
    return filter;
  }

  // 6. Forest & Breeze
  function createForestSound(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);

    noise.connect(filter);
    noise.start();
    return filter;
  }

  // Sound selection buttons
  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSoundPreset = btn.dataset.sound;
      if (isSoundPlaying) {
        startAmbientSound(activeSoundPreset);
      }
    });
  });

  // Toggle ambient audio
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', () => {
      if (isSoundPlaying) stopAmbientSound();
      else startAmbientSound(activeSoundPreset);
    });
  }

  // Volume slider
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(val, audioCtx.currentTime);
      }
    });
  }

  // Certificate Trigger button
  if (triggerCertBtn) {
    triggerCertBtn.addEventListener('click', async () => {
      triggerCertBtn.disabled = true;
      triggerCertBtn.textContent = '⏳ Generating & Sending...';

      try {
        const res = await fetch('/api/send-certificate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          let alertMsg = `🏆 Certificate successfully emailed to ${data.certificate.recipientEmail}!\nCertificate ID: ${data.certificate.id}`;
          if (data.emailResult && data.emailResult.previewUrl) {
            alertMsg += `\n\n📫 Test Email Preview URL:\n${data.emailResult.previewUrl}`;
            window.open(data.emailResult.previewUrl, '_blank');
          }
          alert(alertMsg);
          window.location.href = '/certificate';
        } else {
          alert('Could not send certificate: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to send certificate: ' + err.message);
      } finally {
        triggerCertBtn.disabled = false;
        triggerCertBtn.textContent = '🏆 Email Certificate';
      }
    });
  }

  // Initial update
  updateDisplay();
});
