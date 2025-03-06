import { IComponent } from '../core/ECS/Types';

export interface Unit extends IComponent {
  type: 'unit';
  health: number;
  maxHealth: number;
  attackRange: number;
  attackCooldown: number;
  currentCooldown: number;
  speed: number;
  isPlayer: boolean;
} 