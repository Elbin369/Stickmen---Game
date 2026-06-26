/**
 * ParticleSystem - Visual Effects Engine
 * Manages muzzle flashes, bullet trails, blood splatters, and grenade explosions.
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.trails = [];
        this.explosions = [];
    }

    /**
     * Add a bullet trail vector
     */
    addTrail(startX, startY, endX, endY, color = 'rgba(255, 220, 100, 0.7)', duration = 6) {
        this.trails.push({
            startX,
            startY,
            endX,
            endY,
            color,
            life: duration,
            maxLife: duration
        });
    }

    /**
     * Spawns a burst of blood particles at hit position
     */
    addBlood(x, y, speedX, speedY, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const force = 1 + Math.random() * 4;
            this.particles.push({
                type: 'blood',
                x: x,
                y: y,
                // Combine general hit direction with radial scatter
                vx: speedX * 0.4 + Math.cos(angle) * force,
                vy: speedY * 0.4 + Math.sin(angle) * force - (1 + Math.random() * 2), // upward bias
                radius: 1.5 + Math.random() * 2,
                color: Math.random() > 0.3 ? '#800000' : '#d00000', // dark red variations
                life: 30 + Math.random() * 30,
                maxLife: 60,
                gravity: 0.15
            });
        }
    }

    /**
     * Spawns muzzle flash sparks at gun barrel
     */
    addMuzzleFlash(x, y, angle, count = 8) {
        // Bright muzzle flash shockwave ring
        this.particles.push({
            type: 'flash-ring',
            x: x,
            y: y,
            radius: 5,
            maxRadius: 18,
            color: 'rgba(255, 200, 50, 0.8)',
            life: 4,
            maxLife: 4
        });

        // Sparks flying outward along firing angle
        for (let i = 0; i < count; i++) {
            const spread = 0.4; // cone spread
            const sparkAngle = angle + (Math.random() - 0.5) * spread;
            const speed = 4 + Math.random() * 8;
            
            this.particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                radius: 1 + Math.random() * 1.5,
                color: Math.random() > 0.4 ? '#ff9f43' : '#ffeb3b',
                life: 8 + Math.random() * 8,
                maxLife: 16,
                gravity: 0
            });
        }
    }

    /**
     * Trigger a large grenade explosion: expanding shockwave, fire, smoke, and sparks
     */
    addExplosion(x, y, radius = 60) {
        // 1. Shockwave circle
        this.explosions.push({
            x,
            y,
            radius: 5,
            maxRadius: radius,
            color: 'rgba(255, 235, 200, 0.9)',
            life: 8,
            maxLife: 8
        });

        // 2. Fire/Plume particles (expanding orange/red balls)
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 15;
            const speed = 1 + Math.random() * 3;
            
            this.particles.push({
                type: 'fire',
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5, // float up
                radius: 10 + Math.random() * 15,
                color: Math.random() > 0.4 ? '#ff3838' : '#ff9f43',
                life: 15 + Math.random() * 15,
                maxLife: 30,
                gravity: -0.05 // float up
            });
        }

        // 3. Smoke particles (slower expanding grey clouds)
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 25;
            const speed = 0.5 + Math.random() * 1.5;
            
            this.particles.push({
                type: 'smoke',
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.8, // float up faster
                radius: 15 + Math.random() * 20,
                color: `rgba(${80 + Math.random() * 40}, ${80 + Math.random() * 40}, ${80 + Math.random() * 40}, 0.25)`,
                life: 30 + Math.random() * 45,
                maxLife: 75,
                gravity: -0.02
            });
        }

        // 4. Bright sparks (long trails)
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 10;
            
            this.particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (1 + Math.random() * 3), // upward explosion burst
                radius: 1.5 + Math.random() * 2,
                color: '#ffb830',
                life: 20 + Math.random() * 25,
                maxLife: 45,
                gravity: 0.15 // arc downwards
            });
        }
    }

    /**
     * Update all active particles and trails
     */
    update(w, h, groundY) {
        // Update bullet trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life--;
            if (t.life <= 0) {
                this.trails.splice(i, 1);
            }
        }

        // Update explosion shockwaves
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const e = this.explosions[i];
            e.life--;
            if (e.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Apply gravity
            if (p.gravity) {
                p.vy += p.gravity;
            }

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Hit ground interaction (for blood splatters)
            if (p.type === 'blood' && p.y >= groundY) {
                p.y = groundY;
                p.vx *= 0.5; // slide slow
                p.vy = 0;
            }
        }
    }

    /**
     * Render all particles
     */
    render(ctx) {
        // 1. Draw bullet trails
        ctx.save();
        for (let t of this.trails) {
            const alpha = t.life / t.maxLife;
            ctx.beginPath();
            ctx.moveTo(t.startX, t.startY);
            ctx.lineTo(t.endX, t.endY);
            ctx.strokeStyle = t.color.replace(/[\d\.]+\)$/, `${alpha})`); // dynamically replace alpha
            ctx.lineWidth = 2 * alpha;
            ctx.stroke();
        }
        ctx.restore();

        // 2. Draw explosion shockwaves
        ctx.save();
        for (let e of this.explosions) {
            const ratio = 1 - (e.life / e.maxLife);
            const radius = e.radius + (e.maxRadius - e.radius) * ratio;
            const alpha = e.life / e.maxLife;

            const grad = ctx.createRadialGradient(e.x, e.y, radius * 0.2, e.x, e.y, radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.3, 'rgba(255, 200, 50, 0.6)');
            grad.addColorStop(0.7, `rgba(255, 50, 50, ${alpha * 0.4})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Draw particles
        ctx.save();
        for (let p of this.particles) {
            const alpha = p.life / p.maxLife;
            
            if (p.type === 'blood') {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.min(alpha * 1.5, 1);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            } 
            else if (p.type === 'spark') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.radius;
                ctx.globalAlpha = alpha;
                
                // Draw spark as a short line based on velocity
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
                ctx.stroke();
            } 
            else if (p.type === 'flash-ring') {
                const ratio = 1 - (p.life / p.maxLife);
                const r = p.radius + (p.maxRadius - p.radius) * ratio;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2 * (1 - ratio);
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.stroke();
            } 
            else if (p.type === 'fire') {
                const r = p.radius * (0.6 + alpha * 0.4);
                
                // Fade from yellow to red-orange
                let color = 'rgba(255, 200, 50, 0.4)';
                if (alpha < 0.4) {
                    color = `rgba(239, 68, 68, ${alpha * 0.5})`;
                } else if (alpha < 0.7) {
                    color = `rgba(245, 158, 11, ${alpha * 0.4})`;
                }
                
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            } 
            else if (p.type === 'smoke') {
                const r = p.radius * (1 + (1 - alpha) * 0.5); // expand smoke
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha * 0.25;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
