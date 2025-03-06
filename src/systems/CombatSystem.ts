import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Unit } from '../components';
import { SkillSystem, SkillType } from './SkillSystem';

export class CombatSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private unitQuery = new QueryBuilder()
    .with('position')
    .with('unit')
    .build();

  constructor(private world: World, private skillSystem: SkillSystem) { }

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

      // 如果找到敌人且在攻击范围内，使用技能
      if (nearestEnemy) {
        this.skillSystem.castSkill(entity, nearestEnemy, SkillType.MULTI_ARROW);
        unit.currentCooldown = unit.attackCooldown;
      }
    });
  }
} 