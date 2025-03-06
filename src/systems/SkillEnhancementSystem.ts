import { ISystem, SystemPriority, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { SkillCooldown, SkillEffect, SkillResource, SkillState } from '../components/SkillEnhancements';
import { EventSystem } from '../core/ECS/EventSystem';

export class SkillEnhancementSystem implements ISystem {
    priority = SystemPriority.NORMAL;

    constructor(
        private world: World,
        private eventSystem: EventSystem
    ) {
        // 注册事件监听
        this.eventSystem.on('skill_cast_start', this.handleSkillCastStart.bind(this));
        this.eventSystem.on('skill_cast_end', this.handleSkillCastEnd.bind(this));
        this.eventSystem.on('skill_effect_apply', this.handleSkillEffectApply.bind(this));
    }

    update(deltaTime: number): void {
        this.updateCooldowns(deltaTime);
        this.updateEffects(deltaTime);
        this.updateResources(deltaTime);
        this.updateSkillStates(deltaTime);
    }

    private updateCooldowns(deltaTime: number): void {
        const entities = this.world.query(this.world.createQuery().with('skill_cooldown').build());
        entities.forEach(entity => {
            const cooldown = entity.getComponent<SkillCooldown>('skill_cooldown');
            if (!cooldown) return;

            // 更新全局冷却
            if (cooldown.globalCooldown > 0) {
                cooldown.globalCooldown = Math.max(0, cooldown.globalCooldown - deltaTime);
            }

            // 更新技能冷却
            cooldown.cooldowns.forEach((remaining, skillId) => {
                const newCooldown = Math.max(0, remaining - deltaTime);
                if (newCooldown === 0) {
                    cooldown.cooldowns.delete(skillId);
                    this.eventSystem.emit('skill_cooldown_end', { entity, skillId });
                } else {
                    cooldown.cooldowns.set(skillId, newCooldown);
                }
            });
        });
    }

    private updateEffects(deltaTime: number): void {
        const entities = this.world.query(this.world.createQuery().with('skill_effect').build());
        entities.forEach(entity => {
            const effect = entity.getComponent<SkillEffect>('skill_effect');
            if (!effect) return;

            effect.effects = effect.effects.filter(effectData => {
                effectData.duration -= deltaTime;
                if (effectData.duration <= 0) {
                    this.eventSystem.emit('skill_effect_end', { 
                        entity, 
                        target: effectData.target,
                        type: effectData.type 
                    });
                    return false;
                }
                return true;
            });
        });
    }

    private updateResources(deltaTime: number): void {
        const entities = this.world.query(this.world.createQuery().with('skill_resource').build());
        entities.forEach(entity => {
            const resource = entity.getComponent<SkillResource>('skill_resource');
            if (!resource) return;

            resource.current = Math.min(
                resource.max,
                resource.current + resource.regenRate * deltaTime
            );
        });
    }

    private updateSkillStates(deltaTime: number): void {
        const entities = this.world.query(this.world.createQuery().with('skill_state').build());
        entities.forEach(entity => {
            const state = entity.getComponent<SkillState>('skill_state');
            if (!state) return;

            if (state.isCasting) {
                state.castTime -= deltaTime;
                if (state.castTime <= 0) {
                    state.isCasting = false;
                    this.eventSystem.emit('skill_cast_complete', { entity });
                }
            }

            if (state.isChanneling) {
                state.channelTime -= deltaTime;
                if (state.channelTime <= 0) {
                    state.isChanneling = false;
                    this.eventSystem.emit('skill_channel_complete', { entity });
                }
            }
        });
    }

    private handleSkillCastStart(data: { entity: Entity; skillId: string }): void {
        const state = data.entity.getComponent<SkillState>('skill_state');
        if (state) {
            state.isCasting = true;
            state.canMove = false;
        }
    }

    private handleSkillCastEnd(data: { entity: Entity; skillId: string }): void {
        const state = data.entity.getComponent<SkillState>('skill_state');
        if (state) {
            state.isCasting = false;
            state.canMove = true;
        }
    }

    private handleSkillEffectApply(data: { 
        source: Entity; 
        target: Entity; 
        effect: SkillEffect 
    }): void {
        const { source, target, effect } = data;
        const targetEffects = target.getComponent<SkillEffect>('skill_effect');
        
        if (!targetEffects) {
            target.addComponent<SkillEffect>({
                type: 'skill_effect',
                effects: [...effect.effects]
            });
        } else {
            effect.effects.forEach(newEffect => {
                if (newEffect.stackable) {
                    const existing = targetEffects.effects.find(e => 
                        e.type === newEffect.type && 
                        e.target === newEffect.target
                    );

                    if (existing && newEffect.maxStacks) {
                        const currentStacks = targetEffects.effects.filter(e =>
                            e.type === newEffect.type &&
                            e.target === newEffect.target
                        ).length;

                        if (currentStacks < newEffect.maxStacks) {
                            targetEffects.effects.push(newEffect);
                        }
                    } else {
                        targetEffects.effects.push(newEffect);
                    }
                } else {
                    // 替换非叠加效果
                    const index = targetEffects.effects.findIndex(e =>
                        e.type === newEffect.type &&
                        e.target === newEffect.target
                    );
                    if (index !== -1) {
                        targetEffects.effects[index] = newEffect;
                    } else {
                        targetEffects.effects.push(newEffect);
                    }
                }
            });
        }
    }
} 