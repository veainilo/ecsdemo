import { Entity } from '../core/ECS/Types';
import { IComponent } from '../core/ECS/Types';

export interface Projectile extends IComponent {
    type: 'projectile';
    damage: number;
    speed: number;
    sourceEntity: Entity;
    targetEntity: Entity;
    hitEntities: Set<Entity>;
}

export interface ProjectileMotion extends IComponent {
    type: 'projectile_motion';
    motionType: 'linear' | 'parabolic' | 'homing';
    // 通用运动参数
    flightTime: number;
    totalFlightTime: number;
    // 抛物线参数
    initialHeight?: number;
    maxHeight?: number;
    gravity?: number;
    // 追踪参数
    turnSpeed?: number;
    maxTurnAngle?: number;
}

export interface ProjectileEffect extends IComponent {
    type: 'projectile_effect';
    bounceCount: number;
    maxBounceCount: number;
    pierceCount?: number;
    maxPierceCount?: number;
    aoeRadius?: number;
    statusEffects?: string[];
} 