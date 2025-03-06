import { ISystem, SystemPriority, Entity, QueryBuilder } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position } from '../components/Position';
import { Unit } from '../components/Unit';
import { Tornado, TornadoMovement } from '../components/Tornado';

export class TornadoSystem implements ISystem {
    priority = SystemPriority.NORMAL;
    
    private query = new QueryBuilder()
        .with('position')
        .with('tornado')
        .with('tornado_movement')
        .build();

    constructor(private world: World) {}

    update(deltaTime: number): void {
        const entities = this.world.query(this.query);
        entities.forEach(entity => {
            this.updateTornado(entity, deltaTime);
        });
    }

    private updateTornado(entity: Entity, deltaTime: number): void {
        const tornado = entity.getComponent<Tornado>('tornado');
        const position = entity.getComponent<Position>('position');
        const movement = entity.getComponent<TornadoMovement>('tornado_movement');
        
        if (!tornado || !position || !movement) return;

        // 更新持续时间
        tornado.duration -= deltaTime;
        if (tornado.duration <= 0) {
            entity.destroy();
            return;
        }

        // 更新伤害计时器
        tornado.tickTimer += deltaTime;
        if (tornado.tickTimer >= tornado.tickInterval) {
            this.dealDamage(entity, tornado, position);
            tornado.tickTimer = 0;
            tornado.hitEntities.clear(); // 清空已伤害实体列表
        }

        // 更新移动
        this.updateMovement(entity, position, movement, deltaTime);
    }

    private updateMovement(
        entity: Entity, 
        position: Position, 
        movement: TornadoMovement, 
        deltaTime: number
    ): void {
        const now = performance.now() / 1000;
        
        // 定期更新目标
        if (now - movement.lastTargetUpdateTime >= movement.targetUpdateInterval) {
            const newTarget = this.findNewTarget(entity, position, movement.searchRadius);
            if (newTarget) {
                movement.lastTargetUpdateTime = now;
                const tornado = entity.getComponent<Tornado>('tornado');
                if (tornado) {
                    tornado.targetPos = newTarget;
                }
            }
        }

        // 移动向目标
        const tornado = entity.getComponent<Tornado>('tornado');
        if (tornado?.targetPos) {
            const dx = tornado.targetPos.x - position.x;
            const dy = tornado.targetPos.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // 如果距离目标还有一定距离
                const vx = (dx / distance) * movement.speed;
                const vy = (dy / distance) * movement.speed;
                position.x += vx * deltaTime;
                position.y += vy * deltaTime;
            }
        }
    }

    private findNewTarget(entity: Entity, position: Position, searchRadius: number): Position | null {
        const targets = this.world.query(
            new QueryBuilder().with('position').with('unit').build()
        );

        let nearestTarget: Position | null = null;
        let minDistance = searchRadius;

        targets.forEach(target => {
            const tornado = entity.getComponent<Tornado>('tornado');
            if (!tornado) return;

            const targetPos = target.getComponent<Position>('position');
            const unit = target.getComponent<Unit>('unit');
            
            // 跳过施法者和友方单位
            if (!targetPos || !unit || target === tornado.sourceEntity) return;
            const sourceUnit = tornado.sourceEntity.getComponent<Unit>('unit');
            if (!sourceUnit || unit.isPlayer === sourceUnit.isPlayer) return;
            
            const dx = targetPos.x - position.x;
            const dy = targetPos.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = { 
                    type: 'position',
                    x: targetPos.x, 
                    y: targetPos.y 
                };
            }
        });

        return nearestTarget;
    }

    private dealDamage(entity: Entity, tornado: Tornado, position: Position): void {
        const targets = this.world.query(
            new QueryBuilder().with('position').with('unit').build()
        );

        targets.forEach(target => {
            // 跳过已经伤害过的目标和施法者
            if (tornado.hitEntities.has(target) || target === tornado.sourceEntity) return;

            const targetPos = target.getComponent<Position>('position');
            const unit = target.getComponent<Unit>('unit');
            
            if (!targetPos || !unit) return;

            // 跳过友方单位
            const sourceUnit = tornado.sourceEntity.getComponent<Unit>('unit');
            if (!sourceUnit || unit.isPlayer === sourceUnit.isPlayer) return;

            const dx = targetPos.x - position.x;
            const dy = targetPos.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 在作用范围内造成伤害
            if (distance <= 40) { // aoeRadius
                unit.health -= tornado.damage;
                tornado.hitEntities.add(target);

                // 如果目标死亡
                if (unit.health <= 0) {
                    target.destroy();
                }
            }
        });
    }
} 