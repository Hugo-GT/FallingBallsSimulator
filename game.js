class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to match container
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Game state
        this.running = false; // Start as false
        this.lastTime = 0;
        this.elapsedTime = 0; // Timer in milliseconds

        // Game outcome
        this.gameOutcome = null; // null, 'lost', 'won'

        // Keyboard state
        this.keys = {};
        this.currentKeyPressed = ''; // To display the currently pressed key

        // Ball properties
        this.ball = { x: 0, y: 0, radius: 10, color: 'red' };
        this.ballLane = 'top'; // 'top', 'left', 'right', 'finished'
        this.ballTimeInLane = 0;
        // this.laneDuration = 3000; // 3 seconds for each lane segment (now defined per lane)

        // Ball pathing
        this.nextLane = 'left'; // To alternate between 'left' and 'right'

        // Ball state
        this.ballState = 'moving'; // 'moving', 'caught'

        // Define lane bezier curve points (matching render)
        this.lanePaths = {
            top: {
                p0: { x: this.canvas.width / 2, y: 0 },
                p1: { x: this.canvas.width / 2 + 150, y: this.canvas.height * 0.1 },
                p2: { x: this.canvas.width / 2 - 150, y: this.canvas.height * 0.4 },
                p3: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
                duration: 3000 // 3 seconds
            },
            left: {
                p0: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
                p1: { x: this.canvas.width / 2 - 100, y: this.canvas.height * 0.6 },
                p2: { x: this.canvas.width / 2 - 250, y: this.canvas.height * 0.8 },
                p3: { x: this.canvas.width / 2 - 300, y: this.canvas.height },
                duration: 3000 // 3 seconds
            },
            right: {
                p0: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
                p1: { x: this.canvas.width / 2 + 300, y: this.canvas.height * 0.55 },
                p2: { x: this.canvas.width / 2 - 200, y: this.canvas.height * 0.75 },
                p3: { x: this.canvas.width / 2 + 250, y: this.canvas.height },
                duration: 5000 // 5 seconds
            }
        };
        
        // Initialize game
        this.init();
        
        // Start game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // Helper to get point on cubic Bezier curve
    getBezierPoint(t, p0, p1, p2, p3) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        
        const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
        const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;
        
        return { x, y };
    }

    init() {
        // Add keyboard event listeners
        window.addEventListener('keydown', (event) => {
            this.keys[event.key.toLowerCase()] = true;
            this.currentKeyPressed = event.key.toUpperCase(); // Update displayed key

            if (event.key.toLowerCase() === 'h' && !this.running && this.gameOutcome === null) {
                this.running = true;
                this.lastTime = performance.now(); // Reset the timer when starting
                this.elapsedTime = 0;
                this.gameOutcome = null;
                this.nextLane = 'left'; // Reset for new game

                // Reset ball for start
                this.ballLane = 'top';
                this.ballTimeInLane = 0;
                this.ballState = 'moving';
                const startPoint = this.lanePaths.top.p0;
                this.ball.x = startPoint.x;
                this.ball.y = startPoint.y;
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
            this.currentKeyPressed = ''; // Clear displayed key
        });
    }
    
    update(deltaTime) {
        if (!this.running) return;
        this.elapsedTime += deltaTime;

        // Handle ball state
        if (this.ballState === 'moving') {
            // Update ball position
            if (this.ballLane === 'top') {
                this.ballTimeInLane += deltaTime;
                const t = Math.min(1, this.ballTimeInLane / this.lanePaths.top.duration);
                const currentPoint = this.getBezierPoint(t, 
                    this.lanePaths.top.p0,
                    this.lanePaths.top.p1,
                    this.lanePaths.top.p2,
                    this.lanePaths.top.p3
                );
                this.ball.x = currentPoint.x;
                this.ball.y = currentPoint.y;

                if (t === 1) {
                    this.ballLane = this.nextLane; // Transition to selected lane
                    this.ballTimeInLane = 0;
                    // Ensure ball is exactly at the split point when transitioning
                    this.ball.x = this.lanePaths[this.nextLane].p0.x;
                    this.ball.y = this.lanePaths[this.nextLane].p0.y;

                    // Alternate next lane
                    this.nextLane = (this.nextLane === 'left') ? 'right' : 'left';
                }
            } else if (this.ballLane === 'left') {
                this.ballTimeInLane += deltaTime;
                const t = Math.min(1, this.ballTimeInLane / this.lanePaths.left.duration);
                const currentPoint = this.getBezierPoint(t,
                    this.lanePaths.left.p0,
                    this.lanePaths.left.p1,
                    this.lanePaths.left.p2,
                    this.lanePaths.left.p3
                );
                this.ball.x = currentPoint.x;
                this.ball.y = currentPoint.y;

                if (t === 1) {
                    // Ball reached end of left lane
                    if (!this.keys['a']) {
                        this.running = false;
                        this.gameOutcome = 'lost';
                    } else {
                        this.ballState = 'caught'; // Ball caught!
                        // Keep ball at the end of the left lane
                        this.ball.x = currentPoint.x;
                        this.ball.y = currentPoint.y;
                        this.ballLane = 'finished'; // Mark as finished to prevent further updates
                    }
                }
            } else if (this.ballLane === 'right') {
                this.ballTimeInLane += deltaTime;
                const t = Math.min(1, this.ballTimeInLane / this.lanePaths.right.duration);
                const currentPoint = this.getBezierPoint(t,
                    this.lanePaths.right.p0,
                    this.lanePaths.right.p1,
                    this.lanePaths.right.p2,
                    this.lanePaths.right.p3
                );
                this.ball.x = currentPoint.x;
                this.ball.y = currentPoint.y;

                if (t === 1) {
                    // Ball reached end of right lane
                    if (!this.keys['a']) {
                        this.running = false;
                        this.gameOutcome = 'lost';
                    } else {
                        this.ballState = 'caught'; // Ball caught!
                        // Keep ball at the end of the right lane
                        this.ball.x = currentPoint.x;
                        this.ball.y = currentPoint.y;
                        this.ballLane = 'finished'; // Mark as finished to prevent further updates
                    }
                }
            }
        } else if (this.ballState === 'caught') {
            if (this.keys['h']) {
                // Drop ball back to start
                this.ballLane = 'top';
                this.ballTimeInLane = 0;
                this.ballState = 'moving';
                const startPoint = this.lanePaths.top.p0;
                this.ball.x = startPoint.x;
                this.ball.y = startPoint.y;
                this.keys['h'] = false; // Consume the 'h' press to avoid immediate re-catch
            }
        }
    }
    
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.running) {
            if (this.gameOutcome === 'lost') {
                // Draw "YOU LOST" screen
                this.ctx.fillStyle = '#000';
                this.ctx.font = '40px Arial';
                const lostText = 'YOU LOST';
                const textWidth = this.ctx.measureText(lostText).width;
                this.ctx.fillText(lostText, (this.canvas.width - textWidth) / 2, this.canvas.height / 2);
            } else {
                // Draw start screen
                this.ctx.fillStyle = '#000';
                this.ctx.font = '40px Arial';
                const startText = 'PRESS "H" TO START';
                const textWidth = this.ctx.measureText(startText).width;
                this.ctx.fillText(startText, (this.canvas.width - textWidth) / 2, this.canvas.height / 2);
            }
            return;
        }
        
        // Draw timer (top left)
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        const seconds = Math.floor(this.elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.ctx.fillText(timeString, 10, 30);

        // Draw currently pressed key (left side, below timer)
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Key: ${this.currentKeyPressed}`, 10, 60); // Y-position adjusted
        
        // Draw "Game Running" (top right)
        const gameRunningText = "Game Running";
        const textWidth = this.ctx.measureText(gameRunningText).width;
        this.ctx.fillText(gameRunningText, this.canvas.width - textWidth - 10, 30);

        // Draw game lanes
        this.ctx.strokeStyle = '#333'; // Dark grey color for lanes
        this.ctx.lineWidth = 5;

        // Top lane (curvy)
        this.ctx.beginPath();
        this.ctx.moveTo(this.lanePaths.top.p0.x, this.lanePaths.top.p0.y);
        this.ctx.bezierCurveTo(
            this.lanePaths.top.p1.x, this.lanePaths.top.p1.y,
            this.lanePaths.top.p2.x, this.lanePaths.top.p2.y,
            this.lanePaths.top.p3.x, this.lanePaths.top.p3.y
        );
        this.ctx.stroke();

        // Left lane
        this.ctx.beginPath();
        this.ctx.moveTo(this.lanePaths.left.p0.x, this.lanePaths.left.p0.y);
        this.ctx.bezierCurveTo(
            this.lanePaths.left.p1.x, this.lanePaths.left.p1.y,
            this.lanePaths.left.p2.x, this.lanePaths.left.p2.y,
            this.lanePaths.left.p3.x, this.lanePaths.left.p3.y
        );
        this.ctx.stroke();

        // Right lane
        this.ctx.beginPath();
        this.ctx.moveTo(this.lanePaths.right.p0.x, this.lanePaths.right.p0.y);
        this.ctx.bezierCurveTo(
            this.lanePaths.right.p1.x, this.lanePaths.right.p1.y,
            this.lanePaths.right.p2.x, this.lanePaths.right.p2.y,
            this.lanePaths.right.p3.x, this.lanePaths.right.p3.y
        );
        this.ctx.stroke();

        // Draw the ball
        if (this.gameOutcome !== 'lost') { // Only draw if game is not lost
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = this.ball.color;
            this.ctx.fill();
        }

        // Draw "PRESS 'H' TO DROP" message if ball is caught
        if (this.ballState === 'caught') {
            this.ctx.fillStyle = 'blue';
            this.ctx.font = '25px Arial';
            const dropText = 'PRESS "H" TO DROP';
            const textWidth = this.ctx.measureText(dropText).width;
            this.ctx.fillText(dropText, (this.canvas.width - textWidth) / 2, this.canvas.height / 2 + 50);
        }
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Update and render
        this.update(deltaTime);
        this.render();
        
        // Continue the loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
}); 