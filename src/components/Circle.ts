import { IComponent } from '../core/ECS/Types';

export interface Circle extends IComponent {
  type: 'circle';
  radius: number;
  color: string;
} 