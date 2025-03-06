import { IComponent } from '../core/ECS/Types';
import { Entity } from '../core/ECS/Types';
import { Position } from './Position';

export interface Tornado extends IComponent {
    type: 'tornado';
    sourceEntity: Entity;      // 施法者
    damage: number;           // 每次伤害值
    duration: number;         // 剩余持续时间
    tickTimer: number;        // 伤害计时器
    tickInterval: number;     // 伤害间隔
    targetPos?: Position;     // 当前目标位置
    hitEntities: Set<Entity>; // 本次tick已经伤害过的实体
}

export interface TornadoMovement extends IComponent {
    type: 'tornado_movement';
    speed: number;           // 移动速度
    searchRadius: number;    // 搜索半径
    lastTargetUpdateTime: number; // 上次更新目标的时间
    targetUpdateInterval: number; // 更新目标的间隔
} 