import { IComponent } from '../core/ECS/Types';
import { Entity } from '../core/ECS/Types';

export interface Arrow extends IComponent {
  type: 'arrow';
  damage: number;
  speed: number;
  targetEntity: Entity;
  sourceEntity: Entity;
  bounceCount: number;      // 剩余弹射次数
  maxBounceCount: number;   // 最大弹射次数
  hitEntities: Set<Entity>; // 已经命中的实体，防止重复命中
} 