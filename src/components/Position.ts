import { IComponent } from '../core/ECS/Types';

export interface Position extends IComponent {
  type: 'position';
  x: number;
  y: number;
} 