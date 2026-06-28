import { characterThemes } from '../config.js';

let bgAudio = new Audio();
bgAudio.loop = true;
bgAudio.volume = 0.20; 
let isMusicPlaying = false;

export function toggleMusic(currentCharacter) {
    const btn = document.getElementById('music-toggle');
    if (isMusicPlaying) {
        bgAudio.pause();
        isMusicPlaying = false;
        btn.textContent = "📁 Muted";
        btn.style.background = "rgba(255,255,255,0.05)";
    } else {
        playCurrentCharacterTrack(currentCharacter);
    }
}

export function playCurrentCharacterTrack(currentCharacter) {
    const theme = characterThemes[currentCharacter];
    if (!theme || !theme.bgm) return;
    
    const btn = document.getElementById('music-toggle');
    
    if (bgAudio.src !== theme.bgm) {
        bgAudio.src = theme.bgm;
        bgAudio.load();
    }
    
    bgAudio.play()
        .then(() => {
            isMusicPlaying = true;
            btn.textContent = "🔊 Playing Theme";
            btn.style.background = "var(--bubble-bg)";
        })
        .catch(err => {
            console.log("Audio playback blocked. Awaiting user interaction execution.");
            isMusicPlaying = false;
            btn.textContent = "🎵 Play Theme";
        });
}

export function getMusicState() {
    return isMusicPlaying;
}
