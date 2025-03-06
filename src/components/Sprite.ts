import { IComponent } from '../core/ECS/Types';

export interface Sprite extends IComponent {
  type: 'sprite';
  width: number;
  height: number;
  color: string;
  rotation: number;
} 