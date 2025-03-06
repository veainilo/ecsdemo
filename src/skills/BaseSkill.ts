import { Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position } from '../components';

export interface SkillConfig {
  cooldown: number;
  range: number;
  damage?: number;
  aoeRadius?: number;
  healing?: number;
  duration?: number;
  projectileSpeed?: number;
}

export abstract class BaseSkill {
  protected currentCooldown: number = 0;

  constructor(
    protected world: World,
    protected config: SkillConfig
  ) {}

  abstract cast(source: Entity, target: Entity): void;
  
  update(deltaTime: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime;
    }
  }

  isOnCooldown(): boolean {
    return this.currentCooldown > 0;
  }

  protected startCooldown(): void {
    this.currentCooldown = this.config.cooldown;
  }

  protected getPositions(source: Entity, target: Entity): [Position | null, Position | null] {
    const sourcePos = source.getComponent<Position>('position') || null;
    const targetPos = target.getComponent<Position>('position') || null;
    return [sourcePos, targetPos];
  }

  protected calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
} 