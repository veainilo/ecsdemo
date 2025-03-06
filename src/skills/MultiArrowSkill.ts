import { Entity } from '../core/ECS';
import { Position, Unit, Arrow, Velocity, Sprite, Trail } from '../components';
import { BaseSkill } from './BaseSkill';

export class MultiArrowSkill extends BaseSkill {
  private readonly SPREAD_ANGLE = Math.PI / 6;
  private readonly OFFSET_DISTANCE = 150;
  private readonly BOUNCE_COUNT = 2;

  cast(source: Entity, target: Entity): void {
    const [sourcePos, targetPos] = this.getPositions(source, target);
    if (!sourcePos || !targetPos) return;

    // 中心箭矢
    this.createArrow(source, target);

    // 两侧箭矢
    const baseAngle = Math.atan2(
      targetPos.y - sourcePos.y,
      targetPos.x - sourcePos.x
    );

    for (let i = 1; i <= 2; i++) {
      const angle = baseAngle + this.SPREAD_ANGLE * (i - 1.5);
      const offsetX = Math.cos(angle) * this.OFFSET_DISTANCE;
      const offsetY = Math.sin(angle) * this.OFFSET_DISTANCE;

      const offsetTarget = this.createOffsetTarget(source, targetPos, offsetX, offsetY);
      this.createArrow(source, offsetTarget);
    }
  }

  private createOffsetTarget(source: Entity, targetPos: Position, offsetX: number, offsetY: number): Entity {
    const offsetTarget = this.world.createEntity();
    offsetTarget.addComponent<Position>({
      type: 'position',
      x: targetPos.x + offsetX,
      y: targetPos.y + offsetY
    });
    offsetTarget.addComponent<Unit>({
      type: 'unit',
      health: 100,
      maxHealth: 100,
      attackRange: 0,
      attackCooldown: 0,
      currentCooldown: 0,
      speed: 0,
      isPlayer: !source.getComponent<Unit>('unit')?.isPlayer
    });
    return offsetTarget;
  }

  private createArrow(source: Entity, target: Entity): void {
    const [sourcePos, targetPos] = this.getPositions(source, target);
    if (!sourcePos || !targetPos) return;

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const arrowSpeed = 8;

    const arrow = this.world.createEntity();
    arrow.addComponent<Position>({ type: 'position', x: sourcePos.x, y: sourcePos.y });
    arrow.addComponent<Velocity>({
      type: 'velocity',
      vx: (dx / distance) * arrowSpeed,
      vy: (dy / distance) * arrowSpeed
    });
    arrow.addComponent<Arrow>({
      type: 'arrow',
      damage: this.config.damage ?? 20,
      speed: arrowSpeed,
      targetEntity: target,
      sourceEntity: source,
      bounceCount: this.BOUNCE_COUNT,
      maxBounceCount: this.BOUNCE_COUNT,
      hitEntities: new Set([source])
    });
    arrow.addComponent<Sprite>({
      type: 'sprite',
      width: 30,
      height: 6,
      color: '#FFA500',
      rotation: Math.atan2(dy, dx)
    });
    arrow.addComponent<Trail>({
      type: 'trail',
      points: [{ x: sourcePos.x, y: sourcePos.y }],
      maxPoints: 5
    });
  }
} 