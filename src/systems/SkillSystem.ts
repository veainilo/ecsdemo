import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Unit, Arrow, Velocity, Sprite, Trail } from '../components';

// 技能类型枚举
export enum SkillType {
  MULTI_ARROW = 'MULTI_ARROW',
  // 未来可以添加更多技能类型
  // FIREBALL = 'FIREBALL',
  // HEAL = 'HEAL',
  // etc...
}

// 技能配置接口
interface SkillConfig {
  cooldown: number;
  range: number;
  damage: number;
}

// 技能配置映射
const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  [SkillType.MULTI_ARROW]: {
    cooldown: 1,
    range: 200,
    damage: 10
  }
};

export class SkillSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private arrowQuery = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('arrow')
    .build();

  constructor(private world: World) { }

  // 使用技能的通用方法
  castSkill(source: Entity, target: Entity, skillType: SkillType): void {
    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
    if (!sourcePos || !targetPos) return;

    const config = SKILL_CONFIGS[skillType];
    if (!config) return;

    switch (skillType) {
      case SkillType.MULTI_ARROW:
        this.castMultiArrow(source, target, config);
        break;
      // 未来可以添加更多技能类型的处理
    }
  }

  // 多重箭矢技能
  private castMultiArrow(source: Entity, target: Entity, config: SkillConfig): void {
    const spreadAngle = Math.PI / 6;
    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
    if (!sourcePos || !targetPos) return;

    // 中心箭矢
    this.createArrow(source, target, config, 2);

    // 两侧箭矢
    const baseAngle = Math.atan2(
      targetPos.y - sourcePos.y,
      targetPos.x - sourcePos.x
    );

    for (let i = 1; i <= 2; i++) {
      const angle = baseAngle + spreadAngle * (i - 1.5);
      const offsetX = Math.cos(angle) * 150;
      const offsetY = Math.sin(angle) * 150;

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

      this.createArrow(source, offsetTarget, config, 2);
    }
  }

  // 创建箭矢实体
  private createArrow(source: Entity, target: Entity, config: SkillConfig, bounceCount: number = 2): void {
    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
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
      damage: config.damage,
      speed: arrowSpeed,
      targetEntity: target,
      sourceEntity: source,
      bounceCount: bounceCount,
      maxBounceCount: bounceCount,
      hitEntities: new Set([source])
    });
    arrow.addComponent<Sprite>({
      type: 'sprite',
      width: 30,
      height: 6,
      color: bounceCount > 0 ? '#FFA500' : '#FF4500',
      rotation: Math.atan2(dy, dx)
    });
    arrow.addComponent<Trail>({
      type: 'trail',
      points: [{ x: sourcePos.x, y: sourcePos.y }],
      maxPoints: 5
    });
  }

  // 寻找下一个弹射目标
  private findNextTarget(position: Position, currentTarget: Entity, hitEntities: Set<Entity>): Entity | null {
    let nearestEnemy: Entity | null = null;
    let minDistance = Infinity;
    const maxBounceRange = 200;

    const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
    units.forEach((entity: Entity) => {
      if (hitEntities.has(entity)) return;

      const entityPos = entity.getComponent<Position>('position');
      if (!entityPos) return;

      const dx = entityPos.x - position.x;
      const dy = entityPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= maxBounceRange && distance < minDistance) {
        const unit = entity.getComponent<Unit>('unit');
        const currentTargetUnit = currentTarget.getComponent<Unit>('unit');

        if (unit && currentTargetUnit && unit.isPlayer !== currentTargetUnit.isPlayer) {
          minDistance = distance;
          nearestEnemy = entity;
        }
      }
    });

    return nearestEnemy;
  }

  update(deltaTime: number): void {
    // 处理箭矢移动和命中
    const arrows = this.world.query(this.arrowQuery);
    arrows.forEach((entity: Entity) => {
      const arrow = entity.getComponent<Arrow>('arrow');
      const position = entity.getComponent<Position>('position');
      const trail = entity.getComponent<Trail>('trail');
      
      if (!arrow || !position) return;

      // 更新轨迹
      if (trail) {
        trail.points.unshift({ x: position.x, y: position.y });
        if (trail.points.length > trail.maxPoints) {
          trail.points.pop();
        }
      }

      const targetPos = arrow.targetEntity.getComponent<Position>('position');
      if (!targetPos) {
        entity.destroy();
        return;
      }

      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 检查箭矢是否命中目标
      if (distance < 20) {
        const targetUnit = arrow.targetEntity.getComponent<Unit>('unit');
        if (targetUnit) {
          // 造成伤害
          targetUnit.health -= arrow.damage;
          arrow.hitEntities.add(arrow.targetEntity);

          // 处理目标死亡
          if (targetUnit.health <= 0) {
            arrow.targetEntity.destroy();
          }

          // 处理弹射
          if (arrow.bounceCount > 0) {
            const nextTarget = this.findNextTarget(position, arrow.targetEntity, arrow.hitEntities);
            if (nextTarget) {
              const nextTargetPos = nextTarget.getComponent<Position>('position');
              if (nextTargetPos) {
                const newDx = nextTargetPos.x - position.x;
                const newDy = nextTargetPos.y - position.y;
                const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

                const velocity = entity.getComponent<Velocity>('velocity');
                if (velocity) {
                  velocity.vx = (newDx / newDistance) * arrow.speed;
                  velocity.vy = (newDy / newDistance) * arrow.speed;
                }

                const sprite = entity.getComponent<Sprite>('sprite');
                if (sprite) {
                  sprite.rotation = Math.atan2(newDy, newDx);
                }

                arrow.targetEntity = nextTarget;
                arrow.bounceCount--;
                return;
              }
            }
          }
        }
        entity.destroy();
      }
    });
  }
} 