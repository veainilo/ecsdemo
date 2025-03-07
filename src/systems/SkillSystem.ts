import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Arrow, Velocity, Sprite, Unit, Trail } from '../components';
import { SkillFactory, SkillType, SkillConfig } from '../skills/SkillFactory';
import { SkillRequest, SkillState } from '../components/SkillComponents';

// 持续效果接口
interface Effect {
  type: SkillType;
  duration: number;
  interval: number;
  nextTick: number;
  source: Entity;
  position: Position;
  config: SkillConfig;
}

export class SkillSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private skillRequestQuery = new QueryBuilder()
    .with('skill_request')
    .build();

  private skillStateQuery = new QueryBuilder()
    .with('skill_state')
    .build();

  private arrowQuery = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('arrow')
    .build();

  private skillFactory: SkillFactory;

  constructor(private world: World) {
    this.skillFactory = new SkillFactory(world);
  }

  update(deltaTime: number): void {
    // 处理技能请求
    const requests = this.world.query(this.skillRequestQuery);
    requests.forEach(entity => {
      const request = entity.getComponent<SkillRequest>('skill_request');
      if (!request) return;

      // 执行技能
      const skill = this.skillFactory.getSkill(request.skillType);
      if (skill) {
        skill.cast(request.sourceEntity, request.targetEntity);
      }

      // 移除请求组件
      entity.removeComponent('skill_request');
    });

    // 更新技能状态
    const skillStates = this.world.query(this.skillStateQuery);
    skillStates.forEach(entity => {
      const state = entity.getComponent<SkillState>('skill_state');
      if (!state) return;

      if (state.currentCooldown > 0) {
        state.currentCooldown -= deltaTime;
      }

      // 如果冷却结束且不在引导中，移除状态组件
      if (state.currentCooldown <= 0 && !state.isChanneling) {
        entity.removeComponent('skill_state');
      }
    });

    // 更新所有技能实例
    for (const skill of this.skillFactory.getAllSkills()) {
      skill.update(deltaTime);
    }

    // 处理箭矢的移动和命中
    const projectiles = this.world.query(this.arrowQuery);
    projectiles.forEach(this.updateProjectile.bind(this));
  }

  private updateProjectile(entity: Entity): void {
    const arrow = entity.getComponent<Arrow>('arrow');
    const position = entity.getComponent<Position>('position');
    const velocity = entity.getComponent<Velocity>('velocity');
    const sprite = entity.getComponent<Sprite>('sprite');
    const trail = entity.getComponent<Trail>('trail');
    
    if (!arrow || !position || !velocity || !sprite) return;

    const targetPos = arrow.targetEntity.getComponent<Position>('position');
    if (!targetPos) {
        entity.destroy();
        return;
    }

    // 更新飞行时间
    arrow.flightTime += 1/60; // 假设60帧每秒

    // 计算水平运动
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 计算抛物线高度
    const t = arrow.flightTime / arrow.totalFlightTime; // 归一化时间 (0-1)
    const heightOffset = this.calculateParabolicHeight(t, arrow.maxHeight);
    
    // 更新位置
    position.x += velocity.vx;
    position.y += velocity.vy;
    position.y -= heightOffset - this.calculateParabolicHeight((t - 1/60), arrow.maxHeight); // 应用高度偏移

    // 更新箭矢旋转
    const nextHeightOffset = this.calculateParabolicHeight(t + 1/60, arrow.maxHeight);
    const angleY = (nextHeightOffset - heightOffset) * 60; // 垂直速度
    sprite.rotation = Math.atan2(velocity.vy + angleY, velocity.vx);

    // 更新轨迹
    if (trail) {
        trail.points.unshift({ x: position.x, y: position.y });
        if (trail.points.length > trail.maxPoints) {
            trail.points.pop();
        }
    }

    // 检查是否命中目标
    if (distance < 20) {
        this.handleProjectileHit(entity, arrow);
    }
  }

  private calculateParabolicHeight(t: number, maxHeight: number): number {
    // 使用二次函数计算抛物线高度
    // h = 4 * maxHeight * t * (1 - t)
    // 这个公式在 t=0 和 t=1 时高度为0，在 t=0.5 时达到最大高度
    return 4 * maxHeight * t * (1 - t);
  }

  private handleProjectileHit(entity: Entity, arrow: Arrow): void {
    const targetUnit = arrow.targetEntity.getComponent<Unit>('unit');
    if (!targetUnit) return;

    // 造成伤害
    targetUnit.health -= arrow.damage;
    arrow.hitEntities.add(arrow.targetEntity);

    // 处理目标死亡
    if (targetUnit.health <= 0) {
      arrow.targetEntity.destroy();
    }

    // 处理弹射
    if (arrow.bounceCount > 0) {
      this.handleProjectileBounce(entity, arrow);
    } else {
      entity.destroy();
    }
  }

  private handleProjectileBounce(entity: Entity, arrow: Arrow): void {
    const position = entity.getComponent<Position>('position');
    if (!position) return;

    const nextTarget = this.findNextTarget(position, arrow.targetEntity, arrow.hitEntities);
    if (!nextTarget) {
      entity.destroy();
      return;
    }

    const nextTargetPos = nextTarget.getComponent<Position>('position');
    if (!nextTargetPos) {
      entity.destroy();
      return;
    }

    // 更新箭矢方向
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
  }

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
} 