export const W = "w";
export const A = "a";
export const S = "s";
export const D = "d";
export const SHIFT = "shift";
export const DIRECTIONS = [W, A, S, D];

export class KeyDisplay {
  map: Map<string, HTMLDivElement> = new Map();

  constructor() {
    const w: HTMLDivElement = document.createElement("div");
    const a: HTMLDivElement = document.createElement("div");
    const s: HTMLDivElement = document.createElement("div");
    const d: HTMLDivElement = document.createElement("div");
    const shift: HTMLDivElement = document.createElement("div");

    this.map.set(W, w);
    this.map.set(A, a);
    this.map.set(S, s);
    this.map.set(D, d);
    this.map.set(SHIFT, shift);

    this.map.forEach((v, k) => {
      v.style.color = "rgba(128, 0, 128, 0.7)";
      v.style.fontSize = "16px";
      v.style.fontWeight = "900";
      v.style.position = "absolute";
      v.style.fontFamily = "monospace";
      v.style.textShadow = "1px 1px 2px rgba(0,0,0,0.5)";
      v.style.userSelect = "none";
      v.style.pointerEvents = "none";
      v.textContent = k.toUpperCase();
    });

    this.updatePosition();

    this.map.forEach((v) => {
      document.body.append(v);
    });
  }

  public updatePosition() {
    // Closer grouped - center bottom area
    const centerX = window.innerWidth / 2;
    const bottomY = window.innerHeight - 80;

    // WASD cluster - closer together
    this.map.get(W)!.style.top = `${bottomY - 30}px`;
    this.map.get(A)!.style.top = `${bottomY}px`;
    this.map.get(S)!.style.top = `${bottomY}px`;
    this.map.get(D)!.style.top = `${bottomY}px`;
    this.map.get(SHIFT)!.style.top = `${bottomY + 35}px`;

    this.map.get(W)!.style.left = `${centerX}px`;
    this.map.get(A)!.style.left = `${centerX - 25}px`;
    this.map.get(S)!.style.left = `${centerX}px`;
    this.map.get(D)!.style.left = `${centerX + 25}px`;
    this.map.get(SHIFT)!.style.left = `${centerX - 15}px`;
  }

  public down(key: string) {
    const element = this.map.get(key.toLowerCase());
    if (element) {
      element.style.color = "rgba(255, 100, 100, 0.9)";
      element.style.transform = "scale(1.1)";
    }
  }

  public up(key: string) {
    const element = this.map.get(key.toLowerCase());
    if (element) {
      element.style.color = "rgba(128, 0, 128, 0.7)";
      element.style.transform = "scale(1.0)";
    }
  }
}
