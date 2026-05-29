import { ref } from 'vue';

const isMuted = ref(false);

const SFX = {
    click: '/sounds/click.mp3',
    stop: '/sounds/stop.mp3',
    error: '/sounds/error.mp3',
    win: '/sounds/win.mp3',
    tally: '/sounds/tally.mp3'
};

// Fixed pool limit of HTMLAudioElement per track to prevent GC performance issues on Capacitor/Browsers
const AUDIO_POOL_LIMITS: Record<string, number> = {
    [SFX.click]: 3,
    [SFX.stop]: 1,
    [SFX.error]: 2,
    [SFX.win]: 1,
    [SFX.tally]: 3
};

const audioPools: Record<string, HTMLAudioElement[]> = {};

export function useSound() {

    const play = (url: string, volume = 0.5) => {
        if (isMuted.value) return;

        try {
            if (!audioPools[url]) {
                audioPools[url] = [];
            }

            const pool = audioPools[url];
            const limit = AUDIO_POOL_LIMITS[url] || 2;

            // Find an inactive audio element in the pool
            let sound = pool.find(audio => audio.paused || audio.ended);

            if (!sound) {
                if (pool.length < limit) {
                    // Create new instance and add to pool
                    sound = new Audio(url);
                    pool.push(sound);
                } else {
                    // Pool is full, reuse the oldest/first element in the pool
                    sound = pool[0];
                    sound.pause();
                    sound.currentTime = 0;
                }
            }

            sound.volume = volume;

            const promise = sound.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    console.warn(`[Audio] Playback prevented: ${error}`);
                });
            }
        } catch (err) {
            console.error('[Audio] Error:', err);
        }
    };

    const playClick = () => play(SFX.click, 0.12);
    const playStop = () => play(SFX.stop, 0.45);
    const playError = () => play(SFX.error, 0.35);
    const playWin = () => play(SFX.win, 0.22);
    const playTally = () => play(SFX.tally, 0.08);
    const playUrgency = () => play(SFX.stop, 0.45);  // Tensión controlada para ENDING_COUNTDOWN

    // Aliases for Backward Compatibility
    const playJoin = () => play(SFX.click, 0.12);
    const playTick = () => play(SFX.tally, 0.08);
    const playAlarm = () => play(SFX.error, 0.35);
    const playSuccess = () => play(SFX.win, 0.22);

    const toggleMute = () => {
        isMuted.value = !isMuted.value;
    };

    return {
        isMuted,
        toggleMute,
        playClick,
        playStop,
        playError,
        playWin,
        playTally,
        playUrgency,
        // Compat
        playJoin,
        playTick,
        playAlarm,
        playSuccess
    };
}
