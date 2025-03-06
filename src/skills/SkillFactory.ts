import { World } from '../core/ECS/World';
import { BaseSkill } from './BaseSkill';
import { MultiArrowSkill } from './MultiArrowSkill';
import { ThunderStrikeSkill } from './ThunderStrikeSkill';

export enum SkillType {
  MULTI_ARROW = 'MULTI_ARROW',
  THUNDER_STRIKE = 'THUNDER_STRIKE',
  FIREBALL = 'FIREBALL',
  FROST_NOVA = 'FROST_NOVA',
  POISON_CLOUD = 'POISON_CLOUD',
  HEALING_AURA = 'HEALING_AURA',
  TORNADO = 'TORNADO'
}

export interface SkillConfig {
  cooldown: number;
  range: number;
  damage?: number;
  aoeRadius?: number;
  healing?: number;
  duration?: number;
  projectileSpeed?: number;
  moveSpeed?: number;
}

export const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  [SkillType.MULTI_ARROW]: {
    cooldown: 2,
    range: 300,
    damage: 20
  },
  [SkillType.THUNDER_STRIKE]: {
    cooldown: 4,
    range: 250,
    damage: 40,
    aoeRadius: 50
  },
  [SkillType.FIREBALL]: {
    cooldown: 3,
    range: 200,
    damage: 30,
    aoeRadius: 40,
    projectileSpeed: 200
  },
  [SkillType.FROST_NOVA]: {
    cooldown: 5,
    range: 0,
    damage: 25,
    aoeRadius: 100
  },
  [SkillType.POISON_CLOUD]: {
    cooldown: 8,
    range: 150,
    damage: 10,
    aoeRadius: 60,
    duration: 5
  },
  [SkillType.HEALING_AURA]: {
    cooldown: 10,
    range: 0,
    healing: 20,
    aoeRadius: 80,
    duration: 5
  },
  [SkillType.TORNADO]: {
    cooldown: 10,
    range: 300,
    damage: 15,
    aoeRadius: 40,
    duration: 8,
    moveSpeed: 100
  }
};

export class SkillFactory {
  private skillInstances: Map<SkillType, BaseSkill> = new Map();

  constructor(private world: World) {
    this.initializeSkills();
  }

  private initializeSkills(): void {
    // 初始化多重箭矢技能
    this.skillInstances.set(
      SkillType.MULTI_ARROW,
      new MultiArrowSkill(this.world, SKILL_CONFIGS[SkillType.MULTI_ARROW])
    );

    // 初始化雷击技能
    this.skillInstances.set(
      SkillType.THUNDER_STRIKE,
      new ThunderStrikeSkill(this.world, SKILL_CONFIGS[SkillType.THUNDER_STRIKE])
    );

    // TODO: 初始化其他技能
  }

  getSkill(type: SkillType): BaseSkill | undefined {
    return this.skillInstances.get(type);
  }

  getConfig(type: SkillType): SkillConfig {
    return SKILL_CONFIGS[type];
  }

  getAllSkills(): BaseSkill[] {
    return Array.from(this.skillInstances.values());
  }
} 