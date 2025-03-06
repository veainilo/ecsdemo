import { IComponent } from '../core/ECS/Types';

export interface Trail extends IComponent {
  type: 'trail';
  points: Array<{ x: number; y: number }>;
  maxPoints: number;
} 