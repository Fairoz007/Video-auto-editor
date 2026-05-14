export type TrackType = 'video' | 'audio' | 'text' | 'effect';

export type Clip = {
  id: string;
  name: string;
  type: TrackType;
  start: number;
  duration: number;
  sourceStart: number;
  sourceFile?: string;
  color?: string;
  text?: string;
  effectType?: string;
  transitionType?: string;
};

export type Track = {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
};
