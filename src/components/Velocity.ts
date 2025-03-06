import { IComponent } from '../core/ECS/Types';

export interface Velocity extends IComponent {
  type: 'velocity';
  vx: number;
  vy: number;
} 