import { Entity } from '../core/ECS/Types';
import { Position, Unit, Velocity, Sprite, Trail } from '../components';
import { Projectile, ProjectileMotion, ProjectileEffect } from '../components/Projectile';
import { BaseSkill } from './BaseSkill';

export class MultiArrowSkill extends BaseSkill {
  private readonly SPREAD_ANGLE = Math.PI / 6;
  private readonly OFFSET_DISTANCE = 150;
  private readonly BOUNCE_COUNT = 2;
  private readonly DEFAULT_DAMAGE = 20;
  private readonly ARROW_SPEED = 8;

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

    // 计算抛物线参数
    const maxHeight = Math.min(distance * 0.25, 100); // 最大高度为距离的1/4，但不超过100
    const totalFlightTime = distance / this.ARROW_SPEED;

    const arrow = this.world.createEntity();
    
    // 基础组件
    arrow.addComponent<Position>({ 
      type: 'position', 
      x: sourcePos.x, 
      y: sourcePos.y 
    });
    
    arrow.addComponent<Velocity>({
      type: 'velocity',
      vx: (dx / distance) * this.ARROW_SPEED,
      vy: (dy / distance) * this.ARROW_SPEED
    });

    // 投射物组件
    arrow.addComponent<Projectile>({
      type: 'projectile',
      damage: this.config.damage ?? this.DEFAULT_DAMAGE,
      speed: this.ARROW_SPEED,
      sourceEntity: source,
      targetEntity: target,
      hitEntities: new Set([source])
    });

    // 运动组件
    arrow.addComponent<ProjectileMotion>({
      type: 'projectile_motion',
      motionType: 'parabolic',
      flightTime: 0,
      totalFlightTime: totalFlightTime,
      initialHeight: sourcePos.y,
      maxHeight: maxHeight,
      gravity: 9.8
    });

    // 效果组件
    arrow.addComponent<ProjectileEffect>({
      type: 'projectile_effect',
      bounceCount: this.BOUNCE_COUNT,
      maxBounceCount: this.BOUNCE_COUNT
    });

    // 视觉组件
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