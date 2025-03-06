import { BaseSkill } from './BaseSkill';
import { Entity } from '../core/ECS/Types';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';
import { Tornado, TornadoMovement } from '../components/Tornado';

export const TORNADO_CONFIG = {
    cooldown: 10,        // 冷却时间
    range: 300,          // 施法距离
    damage: 15,          // 每次伤害
    duration: 8,         // 持续时间
    aoeRadius: 40,       // 作用范围
    moveSpeed: 100,      // 移动速度
    tickInterval: 1,     // 伤害间隔
};

export class TornadoSkill extends BaseSkill {
    cast(source: Entity, target: Entity): void {
        if (this.isOnCooldown()) return;

        const sourcePos = source.getComponent<Position>('position');
        const targetPos = target.getComponent<Position>('position');
        if (!sourcePos || !targetPos) return;

        // 创建龙卷风实体
        const tornado = this.world.createEntity();
        
        // 添加位置组件
        tornado.addComponent<Position>({
            type: 'position',
            x: sourcePos.x,
            y: sourcePos.y
        });

        // 添加龙卷风组件
        tornado.addComponent<Tornado>({
            type: 'tornado',
            sourceEntity: source,
            damage: TORNADO_CONFIG.damage,
            duration: TORNADO_CONFIG.duration,
            tickTimer: 0,
            tickInterval: TORNADO_CONFIG.tickInterval,
            hitEntities: new Set()
        });

        // 添加移动组件
        tornado.addComponent<TornadoMovement>({
            type: 'tornado_movement',
            speed: TORNADO_CONFIG.moveSpeed,
            searchRadius: TORNADO_CONFIG.range,
            lastTargetUpdateTime: 0,
            targetUpdateInterval: 0.5 // 每0.5秒更新一次目标
        });

        // 添加视觉组件
        tornado.addComponent<Sprite>({
            type: 'sprite',
            width: TORNADO_CONFIG.aoeRadius * 2,
            height: TORNADO_CONFIG.aoeRadius * 2,
            color: '#88CCFF',
            rotation: 0
        });

        this.startCooldown();
    }
} 