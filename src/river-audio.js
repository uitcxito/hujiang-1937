// Hand-traced on the same 1600 × 800 plan as the paths. Each row gives map v,
// the inland blue line's u, and the river-side red line's u.
const riverSoundLines = [
  [0, 1078, 1525], [61, 1015, 1484], [81, 989, 1357], [90, 978, 1295],
  [110, 952, 1227], [142, 899, 1151], [184, 847, 1100], [219, 806, 1081],
  [245, 774, 1064], [296, 747, 1034], [351, 725, 997], [377, 717, 986],
  [391, 716, 980], [447, 714, 960], [506, 713, 942], [559, 712, 925],
  [627, 711, 914], [706, 711, 912], [787, 718, 916], [855, 719, 934],
];

function riverSoundProfile(x, z) {
  const v = z / SCALE + 370;
  const d = shoreDistance(x, z);
  let i = 1;
  while (i < riverSoundLines.length - 1 && riverSoundLines[i][0] < v) i++;
  const a = riverSoundLines[i - 1], b = riverSoundLines[i];
  const fraction = T.MathUtils.clamp((v - a[0]) / (b[0] - a[0]), 0, 1);
  const depth = (column) => (riverU(v) - T.MathUtils.lerp(a[column], b[column], fraction)) * SCALE * 0.8;
  const blue = Math.max(0, depth(1));
  if (d >= blue) return { level: 0, bankMix: 1 };
  // At its two tips the hand-drawn red line meets the shore. Let the last
  // few metres still resolve into the clear 4 m listening position there.
  const bank = Math.min(4, blue * 0.25);
  const red = T.MathUtils.clamp(depth(2), Math.min(12, blue * 0.65), blue);
  const garden = Math.min(34.9033, bank + (red - bank) * 0.55);
  const middle = (red + blue) / 2;
  const between = (near, far, nearGain, farGain) =>
    T.MathUtils.lerp(nearGain, farGain, T.MathUtils.smoothstep(d, near, far));
  // Linear amplitudes for the approved bank, garden (−12 dB), red line
  // (−14 dB), midpoint (−18 dB) and blue line (silence).
  let level;
  if (d <= bank) level = 1;
  else if (d < garden) level = between(bank, garden, 1, 0.251189);
  else if (d < red) level = between(garden, red, 0.251189, 0.199526);
  else if (d < middle) level = between(red, middle, 0.199526, 0.125893);
  else level = between(middle, blue, 0.125893, 0);
  return { level, bankMix: T.MathUtils.smoothstep(d, garden, red) };
}

function makeRiverAudio(context, output, fieldCompressor, blend) {
  const pan = context.createStereoPanner(), distanceGain = context.createGain();
  distanceGain.gain.value = 0;
  distanceGain.connect(output);
  // Both audition perspectives receive the same samples from one running loop.
  // The walk used the original distance-dependent pickup before compression;
  // the three listening stations used a fixed 4 m pickup. Crossfade their
  // aligned signals between the garden and red line, then apply the map gain.
  function pickup() {
    const input = context.createGain(), weight = context.createGain();
    pan.connect(input).connect(fieldCompressor()).connect(weight).connect(distanceGain);
    return { input: input.gain, weight: weight.gain };
  }
  const walk = pickup(), bank = pickup();
  walk.input.value = walk.weight.value = bank.weight.value = 0;
  bank.input.value = 0.95 * (1 - T.MathUtils.smoothstep(4, 3, 55));
  let previousLevel;
  function silence(now) {
    distanceGain.gain.cancelScheduledValues(now);
    distanceGain.gain.setValueAtTime(0, now);
    previousLevel = 0;
  }
  return {
    start(buffer) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = Math.min(39.6, buffer.duration);
      source.connect(pan);
      source.start();
    },
    silence,
    update(x, z, yaw, now) {
      const { level, bankMix } = riverSoundProfile(x, z);
      if (level !== previousLevel) {
        const gain = distanceGain.gain;
        gain.cancelScheduledValues(now);
        if (level > 0) {
          // The approved reference has a -1.78 dB master and -12 dB shore trim.
          gain.setTargetAtTime(level * 10 ** (-13.78 / 20), now, 0.08);
        } else {
          gain.setValueAtTime(gain.value, now);
          gain.linearRampToValueAtTime(0, now + 0.18);
        }
        previousLevel = level;
      }
      if (!level) return;
      const shore = shoreDistance(x, z), garden = 34.9033;
      const micDistance = Math.min(garden, shore);
      blend(walk.input, 0.95 * (1 - T.MathUtils.smoothstep(micDistance, 3, 55)), now, 0.24);
      // Measured from the same waves at the garden and bank in the 45 s reference.
      const originalLevel = T.MathUtils.lerp(1, 10 ** (-5.491 / 20), T.MathUtils.smoothstep(micDistance, 4, garden));
      blend(walk.weight, (1 - bankMix) / originalLevel, now, 0.08);
      blend(bank.weight, bankMix, now, 0.08);
      const dx = shore - shoreDistance(x + 1, z), dz = shore - shoreDistance(x, z + 1);
      const right = dx * Math.cos(yaw) + dz * Math.sin(yaw);
      blend(pan.pan, 0.6 * right / (Math.hypot(dx, dz) || 1), now, 0.12);
    },
  };
}
