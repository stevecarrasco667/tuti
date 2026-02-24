
const SFX = {
    click: '/sounds/click.mp3',
    stop: '/sounds/stop.mp3',
    error: '/sounds/error.mp3',
    win: '/sounds/win.mp3',
    tally: '/sounds/tally.mp3'
};

const audioCache: Record<string, HTMLAudioElement> = {};

export function useSound() {

    const play = (url: string, volume = 0.5) => {
        try {
            // Simple cache to avoid re-fetching, but allow overlapping sounds (cloneNode)
            if (!audioCache[url]) {
                audioCache[url] = new Audio(url);
            }

            // Clone to allow overlapping instances of the same sound
            const sound = audioCache[url].cloneNode() as HTMLAudioElement;
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

    const playClick = () => play(SFX.click, 0.4);
    const playStop = () => play(SFX.stop, 0.6);
    const playError = () => play(SFX.error, 0.4);
    const playWin = () => play(SFX.win, 0.5);
    const playTally = () => play(SFX.tally, 0.3);

    // Aliases for Backward Compatibility
    const playJoin = () => play(SFX.click, 0.4);
    const playTick = () => play(SFX.tally, 0.3);
    const playAlarm = () => play(SFX.error, 0.4);
    const playSuccess = () => play(SFX.win, 0.5);

    return {
        playClick,
        playStop,
        playError,
        playWin,
        playTally,
        // Compat
        playJoin,
        playTick,
        playAlarm,
        playSuccess
    };
}
