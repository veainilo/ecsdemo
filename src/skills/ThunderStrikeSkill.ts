import { Entity, QueryBuilder } from '../core/ECS/Types';
import { Position, Sprite, Unit, Trail } from '../components';
import { BaseSkill } from './BaseSkill';

export class ThunderStrikeSkill extends BaseSkill {
  private readonly EFFECT_DURATION = 0.2; // 特效持续时间
  private readonly LIGHTNING_COLOR = '#4444FF';
  private readonly LIGHTNING_HEIGHT = 200; // 闪电高度
  private readonly DEFAULT_AOE_RADIUS = 50; // 默认AOE范围
  private readonly DEFAULT_DAMAGE = 40; // 默认伤害值
  private activeEffects: Map<Entity, number> = new Map();

  cast(source: Entity, target: Entity): void {
    if (this.isOnCooldown()) return;

    const [_, targetPos] = this.getPositions(source, target);
    if (!targetPos) return;

    const aoeRadius = this.config.aoeRadius ?? this.DEFAULT_AOE_RADIUS;

    // 创建闪电特效
    const effect = this.world.createEntity();
    effect.addComponent<Position>({
      type: 'position',
      x: targetPos.x,
      y: targetPos.y
    });
    effect.addComponent<Sprite>({
      type: 'sprite',
      width: aoeRadius * 2,
      height: aoeRadius * 2,
      color: this.LIGHTNING_COLOR,
      rotation: 0
    });

    // 添加闪电轨迹
    effect.addComponent<Trail>({
      type: 'trail',
      points: [
        { x: targetPos.x, y: targetPos.y - this.LIGHTNING_HEIGHT },
        { x: targetPos.x, y: targetPos.y }
      ],
      maxPoints: 2
    });

    // 记录特效持续时间
    this.activeEffects.set(effect, this.EFFECT_DURATION);

    // 对范围内的敌人造成伤害
    this.dealAoeDamage(source, targetPos);

    // 开始冷却
    this.startCooldown();
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // 更新特效持续时间
    const expiredEffects: Entity[] = [];
    this.activeEffects.forEach((duration, effect) => {
      const newDuration = duration - deltaTime;
      if (newDuration <= 0) {
        expiredEffects.push(effect);
      } else {
        this.activeEffects.set(effect, newDuration);
      }
    });

    // 移除过期的特效
    expiredEffects.forEach(effect => {
      effect.destroy();
      this.activeEffects.delete(effect);
    });
  }

  private dealAoeDamage(source: Entity, center: Position): void {
    const aoeRadius = this.config.aoeRadius ?? this.DEFAULT_AOE_RADIUS;
    const damage = this.config.damage ?? this.DEFAULT_DAMAGE;

    const sourceUnit = source.getComponent<Unit>('unit');
    if (!sourceUnit) return;

    const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
    units.forEach((entity: Entity) => {
      if (entity === source) return;

      const unitPos = entity.getComponent<Position>('position');
      const unit = entity.getComponent<Unit>('unit');
      if (!unitPos || !unit) return;

      const dx = unitPos.x - center.x;
      const dy = unitPos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= aoeRadius && unit.isPlayer !== sourceUnit.isPlayer) {
        // 造成伤害
        unit.health -= damage;
        
        // 如果单位死亡，销毁它
        if (unit.health <= 0) {
          entity.destroy();
        }
      }
    });
  }
} 