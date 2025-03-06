import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Velocity, Sprite, Unit, Trail } from '../components';
import { Projectile, ProjectileMotion, ProjectileEffect } from '../components/Projectile';
import { EventSystem } from '../core/ECS/EventSystem';

interface MotionStrategy {
    updateMotion(entity: Entity, deltaTime: number): void;
}

class LinearMotionStrategy implements MotionStrategy {
    updateMotion(entity: Entity, deltaTime: number): void {
        const position = entity.getComponent<Position>('position');
        const velocity = entity.getComponent<Velocity>('velocity');
        if (!position || !velocity) return;

        position.x += velocity.vx * deltaTime;
        position.y += velocity.vy * deltaTime;
    }
}

class ParabolicMotionStrategy implements MotionStrategy {
    private calculateHeight(t: number, maxHeight: number): number {
        return 4 * maxHeight * t * (1 - t);
    }

    updateMotion(entity: Entity, deltaTime: number): void {
        const position = entity.getComponent<Position>('position');
        const velocity = entity.getComponent<Velocity>('velocity');
        const motion = entity.getComponent<ProjectileMotion>('projectile_motion');
        const sprite = entity.getComponent<Sprite>('sprite');
        
        if (!position || !velocity || !motion || !sprite || !motion.maxHeight) return;

        // 更新飞行时间
        motion.flightTime += deltaTime;
        const t = motion.flightTime / motion.totalFlightTime;

        // 基础移动
        position.x += velocity.vx * deltaTime;
        position.y += velocity.vy * deltaTime;

        // 计算高度偏移
        const currentHeight = this.calculateHeight(t, motion.maxHeight);
        const previousHeight = this.calculateHeight(t - deltaTime, motion.maxHeight);
        const heightDelta = currentHeight - previousHeight;
        position.y -= heightDelta;

        // 更新旋转
        const nextHeight = this.calculateHeight(t + deltaTime, motion.maxHeight);
        const angleY = (nextHeight - currentHeight) / deltaTime;
        sprite.rotation = Math.atan2(velocity.vy + angleY, velocity.vx);
    }
}

class HomingMotionStrategy implements MotionStrategy {
    updateMotion(entity: Entity, deltaTime: number): void {
        const position = entity.getComponent<Position>('position');
        const velocity = entity.getComponent<Velocity>('velocity');
        const motion = entity.getComponent<ProjectileMotion>('projectile_motion');
        const projectile = entity.getComponent<Projectile>('projectile');
        const sprite = entity.getComponent<Sprite>('sprite');

        if (!position || !velocity || !motion || !projectile || !sprite) return;

        const targetPos = projectile.targetEntity.getComponent<Position>('position');
        if (!targetPos) return;

        // 计算目标方向
        const dx = targetPos.x - position.x;
        const dy = targetPos.y - position.y;
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(velocity.vy, velocity.vx);

        // 限制转向速度
        const turnSpeed = motion.turnSpeed || Math.PI;
        const angleDiff = targetAngle - currentAngle;
        const maxTurn = turnSpeed * deltaTime;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

        // 更新速度和位置
        const newAngle = currentAngle + turn;
        const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
        velocity.vx = Math.cos(newAngle) * speed;
        velocity.vy = Math.sin(newAngle) * speed;

        position.x += velocity.vx * deltaTime;
        position.y += velocity.vy * deltaTime;
        sprite.rotation = newAngle;
    }
}

export class ProjectileSystem implements ISystem {
    priority = SystemPriority.NORMAL;
    private projectileQuery = new QueryBuilder()
        .with('projectile')
        .with('position')
        .with('velocity')
        .build();

    private motionStrategies: Map<string, MotionStrategy> = new Map();

    constructor(
        private world: World,
        private eventSystem: EventSystem
    ) {
        this.motionStrategies.set('linear', new LinearMotionStrategy());
        this.motionStrategies.set('parabolic', new ParabolicMotionStrategy());
        this.motionStrategies.set('homing', new HomingMotionStrategy());
    }

    update(deltaTime: number): void {
        const projectiles = this.world.query(this.projectileQuery);
        projectiles.forEach(entity => this.updateProjectile(entity, deltaTime));
    }

    private updateProjectile(entity: Entity, deltaTime: number): void {
        const projectile = entity.getComponent<Projectile>('projectile');
        const motion = entity.getComponent<ProjectileMotion>('projectile_motion');
        const position = entity.getComponent<Position>('position');
        const trail = entity.getComponent<Trail>('trail');

        if (!projectile || !motion || !position) return;

        // 更新运动
        const strategy = this.motionStrategies.get(motion.motionType);
        if (strategy) {
            strategy.updateMotion(entity, deltaTime);
        }

        // 更新轨迹
        if (trail) {
            trail.points.unshift({ x: position.x, y: position.y });
            if (trail.points.length > trail.maxPoints) {
                trail.points.pop();
            }
        }

        // 检查碰撞
        this.checkCollision(entity);
    }

    private checkCollision(entity: Entity): void {
        const projectile = entity.getComponent<Projectile>('projectile');
        const position = entity.getComponent<Position>('position');
        const effect = entity.getComponent<ProjectileEffect>('projectile_effect');
        
        if (!projectile || !position || !effect) return;

        const targetPos = projectile.targetEntity.getComponent<Position>('position');
        if (!targetPos) {
            entity.destroy();
            return;
        }

        const dx = targetPos.x - position.x;
        const dy = targetPos.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
            this.handleHit(entity, projectile, effect);
        }
    }

    private handleHit(entity: Entity, projectile: Projectile, effect: ProjectileEffect): void {
        const targetUnit = projectile.targetEntity.getComponent<Unit>('unit');
        if (!targetUnit) return;

        // 发送命中事件
        this.eventSystem.emit('projectile_hit', {
            projectile: entity,
            target: projectile.targetEntity,
            damage: projectile.damage,
            effects: effect.statusEffects
        });

        // 处理伤害
        targetUnit.health -= projectile.damage;
        projectile.hitEntities.add(projectile.targetEntity);

        // 处理目标死亡
        if (targetUnit.health <= 0) {
            this.eventSystem.emit('unit_died', {
                unit: projectile.targetEntity,
                killer: projectile.sourceEntity
            });
            projectile.targetEntity.destroy();
        }

        // 处理弹射
        if (effect.bounceCount > 0) {
            this.handleBounce(entity);
        } else {
            entity.destroy();
        }
    }

    private handleBounce(entity: Entity): void {
        const position = entity.getComponent<Position>('position');
        const projectile = entity.getComponent<Projectile>('projectile');
        const effect = entity.getComponent<ProjectileEffect>('projectile_effect');
        
        if (!position || !projectile || !effect) return;

        const nextTarget = this.findNextTarget(position, projectile);
        if (!nextTarget) {
            entity.destroy();
            return;
        }

        // 更新目标和减少弹射次数
        projectile.targetEntity = nextTarget;
        effect.bounceCount--;

        // 重置运动参数
        const motion = entity.getComponent<ProjectileMotion>('projectile_motion');
        if (motion) {
            motion.flightTime = 0;
            // 重新计算飞行时间等参数...
        }

        // 发送弹射事件
        this.eventSystem.emit('projectile_bounce', {
            projectile: entity,
            newTarget: nextTarget
        });
    }

    private findNextTarget(position: Position, projectile: Projectile): Entity | null {
        let nearestEnemy: Entity | null = null;
        let minDistance = Infinity;
        const maxBounceRange = 200;

        const units = this.world.query(new QueryBuilder().with('position').with('unit').build());
        units.forEach((entity: Entity) => {
            if (projectile.hitEntities.has(entity)) return;

            const entityPos = entity.getComponent<Position>('position');
            if (!entityPos) return;

            const dx = entityPos.x - position.x;
            const dy = entityPos.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= maxBounceRange && distance < minDistance) {
                const unit = entity.getComponent<Unit>('unit');
                const sourceUnit = projectile.sourceEntity.getComponent<Unit>('unit');

                if (unit && sourceUnit && unit.isPlayer !== sourceUnit.isPlayer) {
                    minDistance = distance;
                    nearestEnemy = entity;
                }
            }
        });

        return nearestEnemy;
    }
} 