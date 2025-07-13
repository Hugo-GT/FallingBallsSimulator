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

        // Global lane alternation
        this.globalNextLane = 'left';

        // Ball properties
        this.balls = [];
        // Each ball: { x, y, radius, color, lane, timeInLane, state }
        this.addInitialBall();

        // Ball add timer
        this.nextBallTime = 30000; // 30 seconds in ms
        this.ballAddAvailable = false;
        this.ballAddedThisInterval = false;
        this.ballAddCountdownActive = false;
        this.ballAddCountdownTime = 0;

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

            if (event.key.toLowerCase() === 'w' && !this.running && this.gameOutcome === null) {
                this.running = true;
                this.lastTime = performance.now(); // Reset the timer when starting
                this.elapsedTime = 0;
                this.gameOutcome = null;
                this.addInitialBall();
                this.nextBallTime = 30000;
                this.ballAddAvailable = false;
                this.ballAddedThisInterval = false;
                this.ballAddCountdownActive = false;
                this.ballAddCountdownTime = 0;
            }

            // Add new ball if allowed
            if (event.key.toLowerCase() === 'r' && this.ballAddAvailable && !this.ballAddedThisInterval && this.running && this.ballAddCountdownActive) {
                this.addNewBall();
                this.ballAddedThisInterval = true;
                this.ballAddCountdownActive = false;
                this.ballAddCountdownTime = 0;
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

        // Ball add timer logic
        if (this.elapsedTime >= this.nextBallTime) {
            this.ballAddAvailable = true;
            if (!this.ballAddCountdownActive) {
                this.ballAddCountdownActive = true;
                this.ballAddCountdownTime = 10000; // 10 seconds
            }
        }

        // Handle forced add ball countdown
        if (this.ballAddCountdownActive) {
            this.ballAddCountdownTime -= deltaTime;
            if (this.ballAddCountdownTime <= 0) {
                this.running = false;
                this.gameOutcome = 'lost';
                this.ballAddCountdownActive = false;
            }
        }

        // Handle ball state
        let anyBallMoving = false;
        for (const ball of this.balls) {
            if (ball.state === 'moving') {
                anyBallMoving = true;
                if (ball.lane === 'top') {
                    ball.timeInLane += deltaTime;
                    const t = Math.min(1, ball.timeInLane / this.lanePaths.top.duration);
                    const currentPoint = this.getBezierPoint(t, 
                        this.lanePaths.top.p0,
                        this.lanePaths.top.p1,
                        this.lanePaths.top.p2,
                        this.lanePaths.top.p3
                    );
                    ball.x = currentPoint.x;
                    ball.y = currentPoint.y;

                    if (t === 1) {
                        ball.lane = this.globalNextLane;
                        ball.timeInLane = 0;
                        ball.x = this.lanePaths[this.globalNextLane].p0.x;
                        ball.y = this.lanePaths[this.globalNextLane].p0.y;
                        // Alternate global direction
                        this.globalNextLane = (this.globalNextLane === 'left') ? 'right' : 'left';
                    }
                } else if (ball.lane === 'left') {
                    ball.timeInLane += deltaTime;
                    const t = Math.min(1, ball.timeInLane / this.lanePaths.left.duration);
                    const currentPoint = this.getBezierPoint(t,
                        this.lanePaths.left.p0,
                        this.lanePaths.left.p1,
                        this.lanePaths.left.p2,
                        this.lanePaths.left.p3
                    );
                    ball.x = currentPoint.x;
                    ball.y = currentPoint.y;

                    if (t === 1) {
                        if (!this.keys['a']) {
                            this.running = false;
                            this.gameOutcome = 'lost';
                        } else {
                            ball.state = 'caught';
                            ball.x = currentPoint.x;
                            ball.y = currentPoint.y;
                            ball.lane = 'finished';
                        }
                    }
                } else if (ball.lane === 'right') {
                    ball.timeInLane += deltaTime;
                    const t = Math.min(1, ball.timeInLane / this.lanePaths.right.duration);
                    const currentPoint = this.getBezierPoint(t,
                        this.lanePaths.right.p0,
                        this.lanePaths.right.p1,
                        this.lanePaths.right.p2,
                        this.lanePaths.right.p3
                    );
                    ball.x = currentPoint.x;
                    ball.y = currentPoint.y;

                    if (t === 1) {
                        if (!this.keys['d']) {
                            this.running = false;
                            this.gameOutcome = 'lost';
                        } else {
                            ball.state = 'caught';
                            ball.x = currentPoint.x;
                            ball.y = currentPoint.y;
                            ball.lane = 'finished';
                        }
                    }
                }
            } else if (ball.state === 'caught') {
                if (this.keys['w']) {
                    ball.lane = 'top';
                    ball.timeInLane = 0;
                    ball.state = 'moving';
                    const startPoint = this.lanePaths.top.p0;
                    ball.x = startPoint.x;
                    ball.y = startPoint.y;
                    this.keys['w'] = false;
                }
            }
        }

        // Reset ball add interval if time has passed and a ball was added
        if (this.ballAddAvailable && this.ballAddedThisInterval) {
            this.nextBallTime += 30000;
            this.ballAddAvailable = false;
            this.ballAddedThisInterval = false;
            this.ballAddCountdownActive = false;
            this.ballAddCountdownTime = 0;
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

                // Show time played
                this.ctx.font = '28px Arial';
                const seconds = Math.floor(this.elapsedTime / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                const timeString = `Time: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
                const timeWidth = this.ctx.measureText(timeString).width;
                this.ctx.fillText(timeString, (this.canvas.width - timeWidth) / 2, this.canvas.height / 2 + 50);

                // Show balls count
                const ballsString = `Balls: ${this.balls.length}`;
                const ballsWidth = this.ctx.measureText(ballsString).width;
                this.ctx.fillText(ballsString, (this.canvas.width - ballsWidth) / 2, this.canvas.height / 2 + 90);
            } else {
                // Draw start screen
                this.ctx.fillStyle = '#000';
                this.ctx.font = '40px Arial';
                const startText = 'PRESS "W" TO START';
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

        // Draw ball counter under the timer
        this.ctx.font = '18px Arial';
        this.ctx.fillText(`Balls: ${this.balls.length}`, 10, 60);

        // Draw currently pressed key (left side, below timer)
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Key: ${this.currentKeyPressed}`, 10, 90); // Y-position adjusted
        
        // Draw controls under the active key
        this.ctx.font = '16px Arial';
        const controls = [
            'Controls:',
            'W: Start / Drop Ball',
            'A: Catch Ball (Left Lane)',
            'D: Catch Ball (Right Lane)',
            'R: Add Ball (every 30s)',
        ];
        controls.forEach((text, i) => {
            this.ctx.fillText(text, 10, 115 + i * 22); // 22px spacing below the key
        });

        // Draw "Game Running" (top right)
        const gameRunningText = "Game Running";
        const textWidth = this.ctx.measureText(gameRunningText).width;
        this.ctx.fillText(gameRunningText, this.canvas.width - textWidth - 10, 30);

        // Draw add ball countdown if active
        if (this.ballAddCountdownActive) {
            this.ctx.save();
            this.ctx.fillStyle = 'red';
            this.ctx.font = '32px Arial';
            const secondsLeft = Math.ceil(this.ballAddCountdownTime / 1000);
            const countdownText = `ADD NEW BALL! ${secondsLeft}s`;
            const cWidth = this.ctx.measureText(countdownText).width;
            this.ctx.fillText(countdownText, (this.canvas.width - cWidth) / 2, this.canvas.height / 2 - 100);
            this.ctx.restore();
        }

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

        // Draw all balls
        if (this.gameOutcome !== 'lost') {
            for (const ball of this.balls) {
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = ball.color;
                this.ctx.fill();
            }
        }

        // Draw "PRESS 'H' TO DROP" message if any ball is caught
        if (this.balls.some(ball => ball.state === 'caught')) {
            this.ctx.fillStyle = 'blue';
            this.ctx.font = '25px Arial';
            const dropText = 'PRESS "W" TO DROP';
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

    addInitialBall() {
        this.balls = [this.createBall()];
    }

    createBall() {
        return {
            x: this.lanePaths.top.p0.x,
            y: this.lanePaths.top.p0.y,
            radius: 10,
            color: 'red',
            lane: 'top',
            timeInLane: 0,
            state: 'moving', // 'moving', 'caught'
        };
    }

    addNewBall() {
        this.balls.push(this.createBall());
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
}); 