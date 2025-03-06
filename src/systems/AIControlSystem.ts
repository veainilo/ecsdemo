import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Velocity, Unit } from '../components';

export class AIControlSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('unit')
    .build();

  constructor(private world: World) {}

  private findNearestEnemy(entity: Entity): Entity | null {
    const position = entity.getComponent<Position>('position');
    const unit = entity.getComponent<Unit>('unit');
    if (!position || !unit) return null;

    let nearestEnemy: Entity | null = null;
    let minDistance = Infinity;

    const entities = this.world.query(this.query);
    entities.forEach((otherEntity: Entity) => {
      if (otherEntity === entity) return;

      const otherUnit = otherEntity.getComponent<Unit>('unit');
      if (!otherUnit || otherUnit.isPlayer === unit.isPlayer) return;

      const otherPosition = otherEntity.getComponent<Position>('position');
      if (!otherPosition) return;

      const dx = otherPosition.x - position.x;
      const dy = otherPosition.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = otherEntity;
      }
    });

    return nearestEnemy;
  }

  update(deltaTime: number): void {
    const entities = this.world.query(this.query);
    
    entities.forEach((entity: Entity) => {
      const unit = entity.getComponent<Unit>('unit');
      if (unit?.isPlayer) return;

      const velocity = entity.getComponent<Velocity>('velocity');
      const position = entity.getComponent<Position>('position');
      if (!velocity || !position || !unit) return;

      const nearestEnemy = this.findNearestEnemy(entity);
      if (!nearestEnemy) return;

      const enemyPosition = nearestEnemy.getComponent<Position>('position');
      if (!enemyPosition) return;

      // 计算方向
      const dx = enemyPosition.x - position.x;
      const dy = enemyPosition.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 更新速度
      if (distance > unit.attackRange * 0.8) { // 如果距离大于攻击范围的80%，就移动靠近
        velocity.vx = (dx / distance) * unit.speed;
        velocity.vy = (dy / distance) * unit.speed;
      } else {
        velocity.vx = 0;
        velocity.vy = 0;
      }
    });
  }
} 