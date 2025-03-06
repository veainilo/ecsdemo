import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Velocity, Circle } from '../components';

export class BounceSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('velocity')
    .with('circle')
    .build();

  constructor(private world: World) {}

  update(deltaTime: number): void {
    const entities = this.world.query(this.query);
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;

    entities.forEach((entity: Entity) => {
      const position = entity.getComponent<Position>('position');
      const velocity = entity.getComponent<Velocity>('velocity');
      const circle = entity.getComponent<Circle>('circle');

      if (position && velocity && circle) {
        if (position.x - circle.radius <= 0 || position.x + circle.radius >= width) {
          velocity.vx *= -1;
          position.x = Math.max(circle.radius, Math.min(width - circle.radius, position.x));
        }

        if (position.y - circle.radius <= 0 || position.y + circle.radius >= height) {
          velocity.vy *= -1;
          position.y = Math.max(circle.radius, Math.min(height - circle.radius, position.y));
        }
      }
    });
  }
} 