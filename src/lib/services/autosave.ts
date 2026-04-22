let timer: ReturnType<typeof setTimeout> | null = null;
let saveFn: (() => Promise<void>) | null = null;

export function setupAutosave(save: () => Promise<void>, delayMs = 2000) {
    saveFn = save;
    return () => {
        if (timer) clearTimeout(timer);
        saveFn = null;
    };
}

export function triggerAutosave() {
    if (!saveFn) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
        if (saveFn) await saveFn();
    }, 2000);
}
