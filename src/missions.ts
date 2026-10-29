import * as THREE from "three";

export interface Mission {
  id: string;
  title: string;
  done: boolean;
  stage: number;
}

export const missions: Mission[] = [
  { id: "m1", title: "Stock the shelves", done: false, stage: 0 },
  { id: "m2", title: "Light up the park", done: false, stage: 0 },
  { id: "m3", title: "Granny's groceries", done: false, stage: 0 },
];

export function allMissionsDone(): boolean {
  return missions.every((m) => m.done);
}

export function objectiveText(): string {
  if (allMissionsDone()) return "Return to your safehouse 🛸";
  const next = missions.find((m) => !m.done);
  if (!next) return "";
  switch (next.id) {
    case "m1":
      return next.stage === 0
        ? "Grab the stock crate behind the shop (east)"
        : "Deliver it to the shop front";
    case "m2":
      return "Use your pulse (F) on the broken lamppost in the park (west)";
    case "m3":
      return next.stage === 0
        ? "Pick up Granny's groceries by the fountain"
        : "Deliver them to Granny's door (north street)";
    default:
      return "";
  }
}

/** AI-written story beats shown when a mission completes. */
export function missionCompleteText(id: string): string {
  switch (id) {
    case "m1":
      return "Shelves stocked! The shopkeeper smiled. Is that... friendship?";
    case "m2":
      return "The lamppost hums again. Alien tech: 1, darkness: 0.";
    case "m3":
      return "Granny winked at you. Grandmas are the strongest humans. Fact.";
    default:
      return "";
  }
}

/** Renders mission list HTML into the HUD panel. */
export function renderMissions(el: HTMLElement): void {
  el.innerHTML = missions
    .map((m, i) => {
      const cls = m.done ? "done" : i === missions.findIndex((x) => !x.done) ? "active" : "locked";
      return `<div class="${cls}">${m.done ? "✔" : "□"} ${m.title}</div>`;
    })
    .join("");
}

/** Shared material reset helper for world reset. */
export function resetMissions(): void {
  for (const m of missions) {
    m.done = false;
    m.stage = 0;
  }
}
