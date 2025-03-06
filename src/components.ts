import { IComponent } from './ECS/Types';

export interface Position extends IComponent {
  type: 'position';
  x: number;
  y: number;
}

export interface Velocity extends IComponent {
  type: 'velocity';
  vx: number;
  vy: number;
}

export interface Circle extends IComponent {
  type: 'circle';
  radius: number;
  color: string;
} 