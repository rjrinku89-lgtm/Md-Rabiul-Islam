import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outDir = path.resolve('public/audio/bgm');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Lo-Fi Chill: Warm melodic chord pad (C - Em - Am) with soft vinyl crackle
console.log('Generating Lo-Fi Chill...');
execSync(`ffmpeg -y \
  -f lavfi -i "sine=f=261.63:d=60" \
  -f lavfi -i "sine=f=329.63:d=60" \
  -f lavfi -i "sine=f=392.00:d=60" \
  -f lavfi -i "sine=f=130.81:d=60" \
  -f lavfi -i "anoisesrc=d=60:c=pink:r=44100:a=0.015" \
  -filter_complex "[0:a]aeval=val(0)*sin(2*PI*t/3.2)*0.18[a1];[1:a]aeval=val(0)*sin(2*PI*t/3.2+1)*0.15[a2];[2:a]aeval=val(0)*sin(2*PI*t/3.2+2)*0.15[a3];[3:a]volume=0.22[bass];[4:a]volume=0.5[vinyl];[a1][a2][a3][bass][vinyl]amix=inputs=5:duration=first[mix];[mix]lowpass=f=2200,volume=1.3[out]" \
  -map "[out]" -c:a mp3 -b:a 128k "${path.join(outDir, 'lofi_chill.mp3')}"`);

// 2. Cinematic Pulse: Deep sub-bass pulse with suspenseful drone
console.log('Generating Cinematic Pulse...');
execSync(`ffmpeg -y \
  -f lavfi -i "sine=f=55:d=60" \
  -f lavfi -i "sine=f=110:d=60" \
  -f lavfi -i "sine=f=164.81:d=60" \
  -filter_complex "[0:a]aeval=val(0)*(0.5+0.5*sin(2*PI*t/1.2))*0.35[sub];[1:a]aeval=val(0)*sin(2*PI*t/2.4)*0.2[drone1];[2:a]aeval=val(0)*sin(2*PI*t/4.8)*0.15[drone2];[sub][drone1][drone2]amix=inputs=3:duration=first[mix];[mix]volume=1.4[out]" \
  -map "[out]" -c:a mp3 -b:a 128k "${path.join(outDir, 'cinematic_pulse.mp3')}"`);

// 3. Phonk Energy: Fast rhythmic 808 driving pulse
console.log('Generating Phonk Energy...');
execSync(`ffmpeg -y \
  -f lavfi -i "sine=f=65.41:d=60" \
  -f lavfi -i "sine=f=196.00:d=60" \
  -f lavfi -i "anoisesrc=d=60:c=white:r=44100:a=0.02" \
  -filter_complex "[0:a]aeval=val(0)*(0.4+0.6*abs(sin(2*PI*t*2.2)))*0.35[kick];[1:a]aeval=val(0)*abs(sin(2*PI*t*4.4))*0.15[synth];[2:a]aeval=val(0)*abs(sin(2*PI*t*4.4))*0.3[hihat];[kick][synth][hihat]amix=inputs=3:duration=first[mix];[mix]volume=1.3[out]" \
  -map "[out]" -c:a mp3 -b:a 128k "${path.join(outDir, 'phonk_energy.mp3')}"`);

// 4. Ambient Piano: Soft contemplative harmonic chime
console.log('Generating Ambient Piano...');
execSync(`ffmpeg -y \
  -f lavfi -i "sine=f=349.23:d=60" \
  -f lavfi -i "sine=f=440.00:d=60" \
  -f lavfi -i "sine=f=523.25:d=60" \
  -f lavfi -i "sine=f=174.61:d=60" \
  -filter_complex "[0:a]aeval=val(0)*sin(2*PI*t/2.8)*0.18[f1];[1:a]aeval=val(0)*sin(2*PI*t/2.8+1.2)*0.15[f2];[2:a]aeval=val(0)*sin(2*PI*t/2.8+2.4)*0.14[f3];[3:a]volume=0.2[bass];[f1][f2][f3][bass]amix=inputs=4:duration=first[mix];[mix]lowpass=f=3000,volume=1.3[out]" \
  -map "[out]" -c:a mp3 -b:a 128k "${path.join(outDir, 'ambient_piano.mp3')}"`);

console.log('All 4 royalty-free BGM tracks created successfully!');
