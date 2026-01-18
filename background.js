/**
 * සත්සර මල් පැළ - Particle Background Animation
 * Version: 2.0.0 - Flower Theme
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.log('⚠️ Particle canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;
    let isAnimating = false;

    // Flower particle colors
    const flowerColors = [
        '#10b981', // Green
        '#34d399', // Light Green
        '#22c55e', // Bright Green
        '#84cc16', // Lime
        '#fbbf24', // Yellow
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#8b5cf6', // Purple
        '#3b82f6'  // Blue
    ];

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Reinitialize particles on resize
        if (isAnimating) {
            initParticles();
        }
    }

    // Particle class for flower effects
    class Particle {
        constructor(type = 'circle') {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.3 + 0.1;
            this.color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            this.type = type; // 'circle' or 'flower'
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.02 - 0.01;
            this.wobble = Math.random() * 0.5;
            this.wobbleSpeed = Math.random() * 0.02 + 0.01;
            this.wobbleOffset = Math.random() * Math.PI * 2;
        }

        update() {
            // Move particle
            this.x += this.speedX;
            this.y += this.speedY;
            
            // Rotation for flower effect
            this.rotation += this.rotationSpeed;
            
            // Wobble effect
            const wobble = Math.sin(Date.now() * 0.001 * this.wobbleSpeed + this.wobbleOffset) * this.wobble;
            this.x += wobble * 0.5;
            this.y += wobble * 0.3;

            // Wrap around edges
            if (this.x > canvas.width + 20) this.x = -20;
            if (this.x < -20) this.x = canvas.width + 20;
            if (this.y > canvas.height + 20) this.y = -20;
            if (this.y < -20) this.y = canvas.height + 20;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            if (this.type === 'flower') {
                // Draw a simple flower shape
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                
                // Draw flower petals
                const petalCount = 5;
                const petalSize = this.size * 2;
                
                for (let i = 0; i < petalCount; i++) {
                    const angle = (i * Math.PI * 2) / petalCount;
                    ctx.beginPath();
                    ctx.ellipse(
                        Math.cos(angle) * petalSize,
                        Math.sin(angle) * petalSize,
                        petalSize,
                        petalSize * 0.6,
                        0,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
                
                // Draw flower center
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Draw circle particle
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    // Initialize particles
    function initParticles() {
        particles = [];
        const numberOfParticles = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 150);
        
        for (let i = 0; i < numberOfParticles; i++) {
            // 20% chance to create a flower particle
            const type = Math.random() < 0.2 ? 'flower' : 'circle';
            particles.push(new Particle(type));
        }
        
        console.log(`🌸 Created ${particles.length} particles (${particles.filter(p => p.type === 'flower').length} flowers)`);
    }

    // Draw connections between nearby particles
    function connectParticles() {
        const maxDistance = 150;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = (1 - distance / maxDistance) * 0.15;
                    ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Animation loop
    function animate() {
        // Clear canvas with a subtle fade effect
        ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        connectParticles();

        // Continue animation
        animationFrameId = requestAnimationFrame(animate);
    }

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            if (isAnimating) {
                initParticles();
            }
        }, 250);
    });

    // Initialize and start animation
    function startAnimation() {
        if (isAnimating) return;
        
        resizeCanvas();
        initParticles();
        animate();
        isAnimating = true;
        
        console.log('🌸 Particle background animation started');
    }

    // Stop animation
    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isAnimating = false;
    }

    // Start animation
    startAnimation();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopAnimation();
    });

    // Pause animation when page is not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAnimation();
        } else {
            startAnimation();
        }
    });

    // Make animation controls available globally
    window.SathsaraBackground = {
        start: startAnimation,
        stop: stopAnimation,
        resize: resizeCanvas,
        restart: () => {
            stopAnimation();
            startAnimation();
        }
    };
});
