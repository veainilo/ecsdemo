import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Circle } from '../components';

export class RenderSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('circle')
    .build();

  constructor(private world: World) {}

  update(deltaTime: number): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const entities = this.world.query(this.query);
    
    entities.forEach((entity: Entity) => {
      const position = entity.getComponent<Position>('position');
      const circle = entity.getComponent<Circle>('circle');
      
      if (position && circle) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = circle.color;
        ctx.fill();
        ctx.closePath();
      }
    });
  }
} 