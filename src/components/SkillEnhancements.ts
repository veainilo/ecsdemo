import { IComponent, Entity } from '../core/ECS/Types';

// 技能冷却组件
export interface SkillCooldown extends IComponent {
    type: 'skill_cooldown';
    cooldowns: Map<string, number>;
    globalCooldown: number;
}

// 技能效果组件
export interface SkillEffect extends IComponent {
    type: 'skill_effect';
    effects: SkillEffectData[];
}

export interface SkillEffectData {
    type: 'buff' | 'debuff' | 'dot' | 'hot';
    duration: number;
    value: number;
    target: Entity;
    stackable: boolean;
    maxStacks?: number;
}

// 技能范围组件
export interface SkillRange extends IComponent {
    type: 'skill_range';
    rangeType: 'circle' | 'cone' | 'line' | 'rectangle';
    range: number;
    width?: number;    // 对于矩形范围
    angle?: number;    // 对于扇形范围
}

// 技能资源组件
export interface SkillResource extends IComponent {
    type: 'skill_resource';
    resourceType: 'mana' | 'energy' | 'rage';
    current: number;
    max: number;
    regenRate: number;
}

// 技能状态组件
export interface SkillState extends IComponent {
    type: 'skill_state';
    isChanneling: boolean;
    isCasting: boolean;
    canMove: boolean;
    canRotate: boolean;
    interruptible: boolean;
    castTime: number;
    channelTime: number;
}

// 技能增强组件
export interface SkillEnhancement extends IComponent {
    type: 'skill_enhancement';
    modifiers: {
        cooldownReduction: number;
        rangeIncrease: number;
        damageMultiplier: number;
        areaMultiplier: number;
        resourceCostReduction: number;
    };
} 