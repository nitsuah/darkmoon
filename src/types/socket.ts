export interface PlayerState {
  position: [number, number, number];
  rotation: [number, number, number];
}

export type Clients = Record<string, PlayerState>;

export interface SocketEvents {
  move: (clients: Clients) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

export interface MoveEventData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
}
