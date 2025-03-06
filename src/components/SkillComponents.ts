import { Entity } from '../core/ECS/Types';
import { SkillType } from '../skills/SkillFactory';

export interface SkillRequest {
    type: 'skill_request';
    skillType: SkillType;
    sourceEntity: Entity;
    targetEntity: Entity;
}

export interface SkillState {
    type: 'skill_state';
    currentCooldown: number;
    isChanneling: boolean;
    channelTime: number;
} 