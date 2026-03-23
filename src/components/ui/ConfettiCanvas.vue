<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);
let animFrame: number;

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

onMounted(() => {
    const c = canvas.value;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
        x: Math.random() * c.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 6,
        opacity: 1,
    }));

    const draw = () => {
        ctx.clearRect(0, 0, c.width, c.height);
        let alive = false;

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            if (p.y > c.height * 0.6) p.opacity -= 0.015;
            if (p.opacity > 0) alive = true;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }

        if (alive) {
            animFrame = requestAnimationFrame(draw);
        }
    };

    draw();
});

onUnmounted(() => {
    if (animFrame) cancelAnimationFrame(animFrame);
});
</script>

<template>
    <canvas
        ref="canvas"
        class="fixed inset-0 pointer-events-none z-50"
        aria-hidden="true"
    />
</template>
