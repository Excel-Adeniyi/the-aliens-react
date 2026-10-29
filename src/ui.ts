// DOM UI helpers — cached elements + small state helpers.

export const el = {
  hud: document.getElementById("hud") as HTMLElement,
  missionList: document.getElementById("missionList") as HTMLElement,
  objective: document.getElementById("objective") as HTMLElement,
  suspicionFill: document.getElementById("suspicionFill") as HTMLElement,
  toast: document.getElementById("toast") as HTMLElement,
  prompt: document.getElementById("prompt") as HTMLElement,
  abQ: document.getElementById("abQ") as HTMLElement,
  abF: document.getElementById("abF") as HTMLElement,
  abC: document.getElementById("abC") as HTMLElement,
  titleScreen: document.getElementById("titleScreen") as HTMLElement,
  pauseScreen: document.getElementById("pauseScreen") as HTMLElement,
  winScreen: document.getElementById("winScreen") as HTMLElement,
  lossScreen: document.getElementById("lossScreen") as HTMLElement,
};

let toastTimer: number | undefined;

export function showToast(text: string, dur = 3800): void {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), dur);
}

export function showScreen(id: "title" | "pause" | "win" | "loss" | null): void {
  for (const s of [el.titleScreen, el.pauseScreen, el.winScreen, el.lossScreen]) {
    s.classList.add("hidden");
  }
  if (id) {
    const map = {
      title: el.titleScreen,
      pause: el.pauseScreen,
      win: el.winScreen,
      loss: el.lossScreen,
    } as const;
    map[id].classList.remove("hidden");
  }
}

export function setHudVisible(v: boolean): void {
  el.hud.classList.toggle("hidden", !v);
}

export function setSuspicion(v: number): void {
  const pct = Math.min(100, Math.max(0, v));
  el.suspicionFill.style.width = `${pct}%`;
  el.suspicionFill.classList.toggle("mid", pct >= 35 && pct < 70);
  el.suspicionFill.classList.toggle("high", pct >= 70);
}

export function setPrompt(text: string | null): void {
  if (text === null) {
    el.prompt.classList.add("hidden");
  } else {
    el.prompt.innerHTML = text;
    el.prompt.classList.remove("hidden");
  }
}

export function setAbilityStates(
  disguiseOn: boolean,
  pulseCd01: number,
  camoState: "ready" | "active" | "cooldown",
): void {
  el.abQ.classList.toggle("active", disguiseOn);
  el.abF.classList.toggle("cooldown", pulseCd01 > 0);
  el.abF.style.opacity = pulseCd01 > 0 ? String(1 - pulseCd01 * 0.6) : "1";
  el.abC.classList.toggle("active", camoState === "active");
  el.abC.classList.toggle("cooldown", camoState === "cooldown");
  el.abC.style.opacity = camoState === "cooldown" ? "0.45" : "1";
}
