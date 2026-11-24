const MUTE_SOUND =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let player: HTMLAudioElement | null = null;
let canPlay = false;
let isSpeaking = false;

const queue: { urls: string[]; volume: number }[] = [];

function unlockVoiceAudio() {
    if (canPlay || !player || isSpeaking) return;

    player.src = MUTE_SOUND;
    player
        .play()
        .then(() => {
            if (!isSpeaking) player!.pause();
            canPlay = true;
            window.removeEventListener("click", unlockVoiceAudio);
            window.removeEventListener("touchend", unlockVoiceAudio);
        })
        .catch(() => {});
}

if (typeof window !== "undefined") {
    player = new Audio();
    window.addEventListener("click", unlockVoiceAudio);
    window.addEventListener("touchend", unlockVoiceAudio);
}

export async function playVoice(urls: string[], volume = 1) {
    if (!player) return;

    if (isSpeaking) {
        if (queue.length < 2) queue.push({ urls, volume });
        return;
    }

    isSpeaking = true;

    try {
        let next: { urls: string[]; volume: number } | undefined = {
            urls,
            volume,
        };
        while (next) {
            player.volume = next.volume;
            for (const url of next.urls) {
                await new Promise<void>((resolve) => {
                    player!.onended = () => resolve();
                    player!.onerror = () => resolve();
                    player!.src = url;
                    player!.play().catch(() => resolve());
                });
            }
            next = queue.shift();
        }
    } finally {
        isSpeaking = false;
    }
}

export function clearVoiceQueue() {
    queue.length = 0;
}
