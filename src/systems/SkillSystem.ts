import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Unit, Arrow, Velocity, Sprite, Trail } from '../components';

// 技能类型枚举
export enum SkillType {
  MULTI_ARROW = 'MULTI_ARROW',
  THUNDER_STRIKE = 'THUNDER_STRIKE',
  FIREBALL = 'FIREBALL',
  FROST_NOVA = 'FROST_NOVA',
  POISON_CLOUD = 'POISON_CLOUD',
  HEALING_AURA = 'HEALING_AURA'
}

// 技能配置接口
interface SkillConfig {
  cooldown: number;
  range: number;
  damage: number;
  aoeRadius?: number;
  projectileSpeed?: number;
  duration?: number;
  healing?: number;
}

// 技能配置映射
const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  [SkillType.MULTI_ARROW]: {
    cooldown: 1,
    range: 200,
    damage: 10
  },
  [SkillType.THUNDER_STRIKE]: {
    cooldown: 3,
    range: 300,
    damage: 30,
    aoeRadius: 50
  },
  [SkillType.FIREBALL]: {
    cooldown: 2,
    range: 250,
    damage: 25,
    aoeRadius: 40,
    projectileSpeed: 6
  },
  [SkillType.FROST_NOVA]: {
    cooldown: 4,
    range: 0, // 以施法者为中心
    damage: 15,
    aoeRadius: 100
  },
  [SkillType.POISON_CLOUD]: {
    cooldown: 5,
    range: 200,
    damage: 8,
    aoeRadius: 60,
    duration: 3 // 持续3秒
  },
  [SkillType.HEALING_AURA]: {
    cooldown: 6,
    range: 0, // 以施法者为中心
    damage: 0,
    aoeRadius: 80,
    healing: 15,
    duration: 4 // 持续4秒
  }
};

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
  private arrowQuery = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('arrow')
    .build();

  private effectDurations: Map<Entity, number> = new Map();
  private activeEffects: Effect[] = [];

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
      case SkillType.THUNDER_STRIKE:
        this.castThunderStrike(source, target, config);
        break;
      case SkillType.FIREBALL:
        this.castFireball(source, target, config);
        break;
      case SkillType.FROST_NOVA:
        this.castFrostNova(source, config);
        break;
      case SkillType.POISON_CLOUD:
        this.castPoisonCloud(source, target, config);
        break;
      case SkillType.HEALING_AURA:
        this.castHealingAura(source, config);
        break;
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

  // 雷击技能
  private castThunderStrike(source: Entity, target: Entity, config: SkillConfig): void {
    const targetPos = target.getComponent<Position>('position');
    if (!targetPos) return;

    const aoeRadius = config.aoeRadius ?? 50;

    // 创建视觉效果实体
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
      color: '#4444FF',
      rotation: 0
    });

    // 添加轨迹效果，模拟闪电
    effect.addComponent<Trail>({
      type: 'trail',
      points: [
        { x: targetPos.x, y: targetPos.y - aoeRadius },
        { x: targetPos.x, y: targetPos.y }
      ],
      maxPoints: 2
    });

    // 记录效果持续时间
    this.effectDurations.set(effect, 0.2);

    // 对范围内的所有敌人造成伤害
    const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
    units.forEach((entity: Entity) => {
      if (entity === source) return;

      const unitPos = entity.getComponent<Position>('position');
      const unit = entity.getComponent<Unit>('unit');
      if (!unitPos || !unit) return;

      const dx = unitPos.x - targetPos.x;
      const dy = unitPos.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 在AOE范围内且是敌方单位
      if (distance <= aoeRadius && 
          unit.isPlayer !== source.getComponent<Unit>('unit')?.isPlayer) {
        // 造成伤害
        unit.health -= config.damage;
        
        // 如果单位死亡，销毁它
        if (unit.health <= 0) {
          entity.destroy();
        }
      }
    });
  }

  // 火球术
  private castFireball(source: Entity, target: Entity, config: SkillConfig): void {
    const sourcePos = source.getComponent<Position>('position');
    const targetPos = target.getComponent<Position>('position');
    if (!sourcePos || !targetPos || !config.projectileSpeed) return;

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const fireball = this.world.createEntity();
    fireball.addComponent<Position>({ type: 'position', x: sourcePos.x, y: sourcePos.y });
    fireball.addComponent<Velocity>({
      type: 'velocity',
      vx: (dx / distance) * config.projectileSpeed,
      vy: (dy / distance) * config.projectileSpeed
    });
    fireball.addComponent<Sprite>({
      type: 'sprite',
      width: 20,
      height: 20,
      color: '#FF4400',
      rotation: Math.atan2(dy, dx)
    });
    fireball.addComponent<Trail>({
      type: 'trail',
      points: [{ x: sourcePos.x, y: sourcePos.y }],
      maxPoints: 8
    });

    // 记录火球信息用于碰撞检测
    this.effectDurations.set(fireball, 5); // 5秒后消失
  }

  // 冰霜新星
  private castFrostNova(source: Entity, config: SkillConfig): void {
    const sourcePos = source.getComponent<Position>('position');
    if (!sourcePos || !config.aoeRadius) return;

    // 创建视觉效果
    const effect = this.world.createEntity();
    effect.addComponent<Position>({ type: 'position', x: sourcePos.x, y: sourcePos.y });
    effect.addComponent<Sprite>({
      type: 'sprite',
      width: config.aoeRadius * 2,
      height: config.aoeRadius * 2,
      color: '#00FFFF',
      rotation: 0
    });

    // 记录效果持续时间
    this.effectDurations.set(effect, 0.3);

    // 对范围内的敌人造成伤害
    this.dealAoeDamage(source, sourcePos, config);
  }

  // 毒云术
  private castPoisonCloud(source: Entity, target: Entity, config: SkillConfig): void {
    const targetPos = target.getComponent<Position>('position');
    if (!targetPos || !config.duration || !config.aoeRadius) return;

    // 创建毒云视觉效果
    const cloud = this.world.createEntity();
    cloud.addComponent<Position>({ type: 'position', x: targetPos.x, y: targetPos.y });
    cloud.addComponent<Sprite>({
      type: 'sprite',
      width: config.aoeRadius * 2,
      height: config.aoeRadius * 2,
      color: '#00FF00',
      rotation: 0
    });

    // 添加持续效果
    this.activeEffects.push({
      type: SkillType.POISON_CLOUD,
      duration: config.duration,
      interval: 0.5, // 每0.5秒造成一次伤害
      nextTick: 0.5,
      source,
      position: { type: 'position', x: targetPos.x, y: targetPos.y },
      config
    });

    // 记录视觉效果持续时间
    this.effectDurations.set(cloud, config.duration);
  }

  // 治疗光环
  private castHealingAura(source: Entity, config: SkillConfig): void {
    const sourcePos = source.getComponent<Position>('position');
    if (!sourcePos || !config.duration || !config.aoeRadius) return;

    // 创建光环视觉效果
    const aura = this.world.createEntity();
    aura.addComponent<Position>({ type: 'position', x: sourcePos.x, y: sourcePos.y });
    aura.addComponent<Sprite>({
      type: 'sprite',
      width: config.aoeRadius * 2,
      height: config.aoeRadius * 2,
      color: '#FFFF00',
      rotation: 0
    });

    // 添加持续效果
    this.activeEffects.push({
      type: SkillType.HEALING_AURA,
      duration: config.duration,
      interval: 1, // 每秒治疗一次
      nextTick: 1,
      source,
      position: { type: 'position', x: sourcePos.x, y: sourcePos.y },
      config
    });

    // 记录视觉效果持续时间
    this.effectDurations.set(aura, config.duration);
  }

  // 处理范围伤害
  private dealAoeDamage(source: Entity, center: Position, config: SkillConfig): void {
    const aoeRadius = config.aoeRadius ?? 0;
    if (aoeRadius <= 0) return;

    const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
    units.forEach((entity: Entity) => {
      if (entity === source) return;

      const unitPos = entity.getComponent<Position>('position');
      const unit = entity.getComponent<Unit>('unit');
      if (!unitPos || !unit) return;

      const dx = unitPos.x - center.x;
      const dy = unitPos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= aoeRadius && 
          unit.isPlayer !== source.getComponent<Unit>('unit')?.isPlayer) {
        unit.health -= config.damage;
        if (unit.health <= 0) {
          entity.destroy();
        }
      }
    });
  }

  // 处理范围治疗
  private dealAoeHealing(source: Entity, center: Position, config: SkillConfig): void {
    const aoeRadius = config.aoeRadius ?? 0;
    const healing = config.healing ?? 0;
    if (aoeRadius <= 0 || healing <= 0) return;

    const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
    units.forEach((entity: Entity) => {
      const unitPos = entity.getComponent<Position>('position');
      const unit = entity.getComponent<Unit>('unit');
      if (!unitPos || !unit) return;

      const dx = unitPos.x - center.x;
      const dy = unitPos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= aoeRadius && 
          unit.isPlayer === source.getComponent<Unit>('unit')?.isPlayer) {
        unit.health = Math.min(unit.health + healing, unit.maxHealth);
      }
    });
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
    // 更新技能效果持续时间
    this.effectDurations.forEach((duration, entity) => {
      const newDuration = duration - deltaTime;
      if (newDuration <= 0) {
        entity.destroy();
        this.effectDurations.delete(entity);
      } else {
        this.effectDurations.set(entity, newDuration);
      }
    });

    // 更新持续性效果
    this.activeEffects = this.activeEffects.filter(effect => {
      effect.duration -= deltaTime;
      effect.nextTick -= deltaTime;

      if (effect.nextTick <= 0) {
        effect.nextTick = effect.interval;
        
        // 根据效果类型执行相应的动作
        switch (effect.type) {
          case SkillType.POISON_CLOUD:
            this.dealAoeDamage(effect.source, effect.position, effect.config);
            break;
          case SkillType.HEALING_AURA:
            this.dealAoeHealing(effect.source, effect.position, effect.config);
            break;
        }
      }

      return effect.duration > 0;
    });

    // 处理箭矢和火球的移动和命中
    const projectiles = this.world.query(this.arrowQuery);
    projectiles.forEach((entity: Entity) => {
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

      // 检查是否命中目标
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