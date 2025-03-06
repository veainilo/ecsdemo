import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Unit } from '../components';
import { SkillType } from '../skills/SkillFactory';
import { SkillRequest } from '../components/SkillComponents';
import { TornadoSkill } from '../skills/TornadoSkill';

export class CombatSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private unitQuery = new QueryBuilder()
    .with('position')
    .with('unit')
    .build();
  private tornadoSkill: TornadoSkill;

  constructor(private world: World) {
    this.tornadoSkill = new TornadoSkill(world, {
      cooldown: 10,
      range: 300
    });
  }

  private selectSkill(unit: Unit): SkillType {
    // 如果是玩家，使用龙卷风技能
    if (unit.isPlayer) {
      return 'TORNADO' as SkillType;
    }

    // 如果生命值低于30%且是玩家单位，优先使用治疗光环
    if (unit.isPlayer && unit.health < unit.maxHealth * 0.3) {
      return SkillType.HEALING_AURA;
    }

    // 随机选择技能
    const rand = Math.random();
    if (rand < 0.4) {
      return SkillType.MULTI_ARROW;
    } else if (rand < 0.6) {
      return SkillType.THUNDER_STRIKE;
    } else if (rand < 0.75) {
      return SkillType.FIREBALL;
    } else if (rand < 0.85) {
      return SkillType.FROST_NOVA;
    } else {
      return SkillType.POISON_CLOUD;
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

      // 如果找到敌人且在攻击范围内，发出技能请求
      if (nearestEnemy) {
        const skillType = this.selectSkill(unit);
        if (skillType === SkillType.TORNADO) {
          this.tornadoSkill.cast(entity, nearestEnemy);
        } else {
          entity.addComponent<SkillRequest>({
            type: 'skill_request',
            skillType: skillType,
            sourceEntity: entity,
            targetEntity: nearestEnemy
          });
          unit.currentCooldown = unit.attackCooldown;
        }
      }
    });
  }

  private findNearestEnemy(entity: Entity): Entity | null {
    const position = entity.getComponent<Position>('position');
    const unit = entity.getComponent<Unit>('unit');
    if (!position || !unit) return null;

    let nearestEnemy: Entity | null = null;
    let minDistance = Infinity;

    const entities = this.world.query(this.unitQuery);
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
} 