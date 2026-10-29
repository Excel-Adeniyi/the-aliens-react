import { Game } from "./game";
import { el, showScreen, setHudVisible } from "./ui";

const container = document.getElementById("app") as HTMLElement;
const game = new Game(container);

// Title screen.
el.titleScreen.classList.remove("hidden");
showScreen("title");
setHudVisible(false);

document.getElementById("btnPlay")?.addEventListener("click", () => {
  game.start();
});
document.getElementById("btnResume")?.addEventListener("click", () => {
  game.resume();
});
document.getElementById("btnRestart")?.addEventListener("click", () => {
  game.restart();
});
document.getElementById("btnControls")?.addEventListener("click", () => {
  game.showControls();
});
document.getElementById("btnWinRestart")?.addEventListener("click", () => {
  game.restart();
});
document.getElementById("btnLossRestart")?.addEventListener("click", () => {
  game.restart();
});

// Clicking the canvas while paused resumes (common game convention).
document.getElementById("app")?.addEventListener("click", () => {
  // Only resume via the button; clicking canvas during play just locks pointer.
  if (document.pointerLockElement === null && document.getElementById("pauseScreen")?.classList.contains("hidden") === false) {
    game.resume();
  }
});
