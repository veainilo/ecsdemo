import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Unit, Arrow, Velocity, Sprite } from '../components';

export class CombatSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private unitQuery = new QueryBuilder()
    .with('position')
    .with('unit')
    .build();

  private arrowQuery = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('arrow')
    .build();

  constructor(private world: World) { }

  private findNextTarget(position: Position, currentTarget: Entity, hitEntities: Set<Entity>): Entity | null {
    let nearestEnemy: Entity | null = null;
    let minDistance = Infinity;
    const maxBounceRange = 200; // 弹射最大范围

    const units = this.world.query(this.unitQuery);
    units.forEach((entity: Entity) => {
      // 跳过已经命中的目标
      if (hitEntities.has(entity)) return;

      const entityPos = entity.getComponent<Position>('position');
      if (!entityPos) return;

      const dx = entityPos.x - position.x;
      const dy = entityPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 在弹射范围内且距离最近的目标
      if (distance <= maxBounceRange && distance < minDistance) {
        const unit = entity.getComponent<Unit>('unit');
        const currentTargetUnit = currentTarget.getComponent<Unit>('unit');

        // 确保目标是敌方单位
        if (unit && currentTargetUnit && unit.isPlayer !== currentTargetUnit.isPlayer) {
          minDistance = distance;
          nearestEnemy = entity;
        }
      }
    });

    return nearestEnemy;
  }

  private createArrow(source: Entity, target: Entity, bounceCount: number = 2): void {
    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
    if (!sourcePos || !targetPos) return;

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const arrowSpeed = 5; // 降低箭矢速度

    const arrow = this.world.createEntity();
    arrow.addComponent<Position>({ type: 'position', x: sourcePos.x, y: sourcePos.y });
    arrow.addComponent<Velocity>({
      type: 'velocity',
      vx: (dx / distance) * arrowSpeed,
      vy: (dy / distance) * arrowSpeed
    });
    arrow.addComponent<Arrow>({
      type: 'arrow',
      damage: 10,
      speed: arrowSpeed,
      targetEntity: target,
      sourceEntity: source,
      bounceCount: bounceCount,
      maxBounceCount: bounceCount,
      hitEntities: new Set([source])
    });
    arrow.addComponent<Sprite>({
      type: 'sprite',
      width: 10,
      height: 2,
      color: bounceCount > 0 ? '#FFD700' : '#FFF',
      rotation: Math.atan2(dy, dx)
    });
  }

  private createMultipleArrows(source: Entity, target: Entity): void {
    const arrowCount = 3;
    const spreadAngle = Math.PI / 8;

    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
    if (!sourcePos || !targetPos) return;

    const baseAngle = Math.atan2(
      targetPos.y - sourcePos.y,
      targetPos.x - sourcePos.x
    );

    for (let i = 0; i < arrowCount; i++) {
      const angle = baseAngle + spreadAngle * (i - (arrowCount - 1) / 2);
      const distance = 100; // 减小虚拟目标距离，使箭矢路径更短

      const virtualTarget = this.world.createEntity();
      virtualTarget.addComponent<Position>({
        type: 'position',
        x: sourcePos.x + Math.cos(angle) * distance,
        y: sourcePos.y + Math.sin(angle) * distance
      });

      this.createArrow(source, virtualTarget, 2);
      virtualTarget.destroy();
    }
  }

  update(deltaTime: number): void {
    // 处理单位攻击
    const units = this.world.query(this.unitQuery);
    units.forEach((entity: Entity) => {
      const unit = entity.getComponent<Unit>('unit');
      const position = entity.getComponent<Position>('position');
      if (!unit || !position) return;

      // 更新冷却时间
      if (unit.currentCooldown > 0) {
        unit.currentCooldown -= deltaTime;
        return;
      }

      // 寻找最近的敌人
      let nearestEnemy: Entity | null = null;
      let minDistance = Infinity;

      units.forEach((otherEntity: Entity) => {
        if (otherEntity === entity) return;

        const otherUnit = otherEntity.getComponent<Unit>('unit');
        if (!otherUnit || otherUnit.isPlayer === unit.isPlayer) return;

        const otherPosition = otherEntity.getComponent<Position>('position');
        if (!otherPosition) return;

        const dx = otherPosition.x - position.x;
        const dy = otherPosition.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= unit.attackRange && distance < minDistance) {
          minDistance = distance;
          nearestEnemy = otherEntity;
        }
      });

      // 如果找到敌人且在攻击范围内，发射箭矢
      if (nearestEnemy) {
        this.createMultipleArrows(entity, nearestEnemy);
        unit.currentCooldown = unit.attackCooldown;
      }
    });

    // 处理箭矢命中和弹射
    const arrows = this.world.query(this.arrowQuery);
    arrows.forEach((entity: Entity) => {
      const arrow = entity.getComponent<Arrow>('arrow');
      const position = entity.getComponent<Position>('position');
      if (!arrow || !position) return;

      const targetPos = arrow.targetEntity.getComponent<Position>('position');
      if (!targetPos) {
        entity.destroy();
        return;
      }

      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 检查箭矢是否命中目标
      if (distance < 20) { // 增加命中检测范围，补偿较慢的速度
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
              // 更新箭矢方向和目标
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
                return; // 继续追踪新目标
              }
            }
          }
        }
        // 如果没有找到新的弹射目标或弹射次数用完，销毁箭矢
        entity.destroy();
      }
    });
  }
} 