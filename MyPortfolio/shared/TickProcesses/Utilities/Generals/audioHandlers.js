export function playAudio(audios, audioInstanceIndex, volume = 1.0) {
  const audio = audios[audioInstanceIndex];

  if (audio) {
    audio.volume = volume;
    audio.play();
  }
}

export function playAudioRandom(audios, volume = null) {
  const max = audios.length - 1;
  const index = Math.round(Math.random() * (max - 0)) + 0;

  if (!volume) {
    audio.volume = Math.random() * (0.7 - 0.5) + 0.5;
  } else {
    audio.volume = volume;
  }

  const audio = audios[index];

  if (audio) {
    audio.play();
  }
}
