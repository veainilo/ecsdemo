import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Velocity } from '../components';

export class MovementSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .build();

  constructor(private world: World) {}

  update(deltaTime: number): void {
    const entities = this.world.query(this.query);
    
    entities.forEach((entity: Entity) => {
      const position = entity.getComponent<Position>('position');
      const velocity = entity.getComponent<Velocity>('velocity');
      
      if (position && velocity) {
        position.x += velocity.vx;
        position.y += velocity.vy;
      }
    });
  }
} 