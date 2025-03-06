import { ISystem, SystemPriority, QueryBuilder, Entity } from '../core/ECS/Types';
import { World } from '../core/ECS/World';
import { Position, Sprite, Unit, Trail } from '../components';

export class RenderSystem implements ISystem {
  priority = SystemPriority.NORMAL;
  private query = new QueryBuilder()
    .with('position')
    .with('sprite')
    .build();

  constructor(private world: World) {}

  update(deltaTime: number): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const entities = this.world.query(this.query);
    
    // 先渲染轨迹
    entities.forEach((entity: Entity) => {
      const position = entity.getComponent<Position>('position');
      const sprite = entity.getComponent<Sprite>('sprite');
      const trail = entity.getComponent<Trail>('trail');
      
      if (!position || !sprite || !trail || trail.points.length < 2) return;

      // 绘制轨迹
      ctx.beginPath();
      ctx.moveTo(trail.points[0].x, trail.points[0].y);
      
      for (let i = 1; i < trail.points.length; i++) {
        ctx.lineTo(trail.points[i].x, trail.points[i].y);
      }
      
      ctx.strokeStyle = sprite.color;
      ctx.lineWidth = sprite.height * 0.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    // 然后渲染实体
    entities.forEach((entity: Entity) => {
      const position = entity.getComponent<Position>('position');
      const sprite = entity.getComponent<Sprite>('sprite');
      const unit = entity.getComponent<Unit>('unit');
      
      if (!position || !sprite) return;

      ctx.save();
      
      // 移动到实体位置并应用旋转
      ctx.translate(position.x, position.y);
      ctx.rotate(sprite.rotation);
      
      // 绘制实体
      ctx.fillStyle = sprite.color;
      ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      
      // 如果是单位，绘制血条
      if (unit) {
        const healthBarWidth = 40;
        const healthBarHeight = 4;
        const healthPercentage = unit.health / unit.maxHealth;
        
        // 重置旋转以确保血条始终水平
        ctx.rotate(-sprite.rotation);
        
        // 绘制血条背景
        ctx.fillStyle = '#333';
        ctx.fillRect(-healthBarWidth / 2, -sprite.height / 2 - 10, healthBarWidth, healthBarHeight);
        
        // 绘制当前血量
        ctx.fillStyle = unit.isPlayer ? '#00FF00' : '#FF0000';
        ctx.fillRect(
          -healthBarWidth / 2,
          -sprite.height / 2 - 10,
          healthBarWidth * healthPercentage,
          healthBarHeight
        );
      }
      
      ctx.restore();
    });
  }
} 