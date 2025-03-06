import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Velocity, Unit } from '../components';

export class PlayerControlSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('unit')
    .build();

  private keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  constructor(private world: World) {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key in this.keys) {
      this.keys[event.key as keyof typeof this.keys] = true;
      // 防止方向键滚动页面
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.key in this.keys) {
      this.keys[event.key as keyof typeof this.keys] = false;
      // 防止方向键滚动页面
      event.preventDefault();
    }
  }

  update(deltaTime: number): void {
    const entities = this.world.query(this.query);
    
    entities.forEach((entity: Entity) => {
      const unit = entity.getComponent<Unit>('unit');
      if (!unit?.isPlayer) return;

      const velocity = entity.getComponent<Velocity>('velocity');
      if (!velocity) return;

      velocity.vx = 0;
      velocity.vy = 0;

      if (this.keys.ArrowUp) velocity.vy = -unit.speed;
      if (this.keys.ArrowDown) velocity.vy = unit.speed;
      if (this.keys.ArrowLeft) velocity.vx = -unit.speed;
      if (this.keys.ArrowRight) velocity.vx = unit.speed;

      // 对角线移动时保持相同速度
      if ((this.keys.ArrowUp || this.keys.ArrowDown) && (this.keys.ArrowLeft || this.keys.ArrowRight)) {
        velocity.vx *= Math.SQRT1_2;
        velocity.vy *= Math.SQRT1_2;
      }
    });
  }
} 