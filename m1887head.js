// == Enhanced Vector3 + Advanced Kalman Filter ==
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { 
    this.x = x; this.y = y; this.z = z; 
  }
  
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { 
    const mag = this.magnitude();
    return mag > 0 ? this.multiplyScalar(1 / mag) : Vector3.zero();
  }
  distance(v) { return this.subtract(v).magnitude(); }
  lerp(v, t) { return this.add(v.subtract(this).multiplyScalar(t)); }
  static zero() { return new Vector3(0, 0, 0); }
}

// == Advanced Kalman Filter with Adaptive Parameters ==
class AdaptiveKalmanFilter {
  constructor(R = 0.005, Q = 0.0008) {
    this.R = R; // Measurement noise (lower = more responsive)
    this.Q = Q; // Process noise (lower = smoother)
    this.A = 1; this.C = 1;
    this.x = NaN; this.cov = NaN;
    this.adaptiveR = R;
    this.velocityBuffer = [];
    this.maxBufferSize = 5;
  }
  
  updateAdaptiveNoise(velocity) {
    // Adaptive noise based on movement speed
    this.velocityBuffer.push(velocity);
    if (this.velocityBuffer.length > this.maxBufferSize) {
      this.velocityBuffer.shift();
    }
    
    const avgVelocity = this.velocityBuffer.reduce((a, b) => a + b, 0) / this.velocityBuffer.length;
    this.adaptiveR = this.R * (1 + avgVelocity * 0.1); // Increase noise for fast movement
  }
  
  filter(z, velocity = 0) {
    this.updateAdaptiveNoise(velocity);
    
    if (isNaN(this.x)) {
      this.x = z; 
      this.cov = this.adaptiveR;
    } else {
      const predX = this.A * this.x;
      const predCov = this.cov + this.Q;
      const K = predCov * this.C / (this.C * predCov * this.C + this.adaptiveR);
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }
    return this.x;
  }
}

// == Enhanced Weapon Profiles ==
const WeaponProfiles = {
  "M1887": { 
    recoilSmooth: 1.2,        // Increased for better recoil compensation
    dragSensitivity: 3.8,     // Significantly increased for faster tracking
    aimLockStrength: 2.5,     // Enhanced lock strength
    accuracyBoost: 2.8,       // Higher accuracy
    predictionFactor: 1.6,    // Movement prediction
    smoothingFactor: 0.85,    // Aim smoothing
    snapThreshold: 0.15,      // Distance threshold for instant snap
    velocityCompensation: 1.4 // Velocity-based compensation
  },
  "DEFAULT": { 
    recoilSmooth: 0.8, 
    dragSensitivity: 2.0, 
    aimLockStrength: 2.0, 
    accuracyBoost: 2.0,
    predictionFactor: 1.0,
    smoothingFactor: 0.7,
    snapThreshold: 0.1,
    velocityCompensation: 1.0
  }
};

// == Enhanced AimLock System ==
class EnhancedAimLockToHead {
  constructor(weapon = "DEFAULT") {
    this.weapon = weapon;
    this.profile = WeaponProfiles[weapon] || WeaponProfiles["DEFAULT"];
    
    // Advanced Kalman filters
    this.kalmanX = new AdaptiveKalmanFilter(0.003, 0.0005);
    this.kalmanY = new AdaptiveKalmanFilter(0.003, 0.0005);
    this.kalmanZ = new AdaptiveKalmanFilter(0.003, 0.0005);
    
    // Movement tracking
    this.prevHeadPos = null;
    this.velocity = Vector3.zero();
    this.acceleration = Vector3.zero();
    this.prevVelocity = Vector3.zero();
    this.lastTime = Date.now();
    
    // History for better prediction
    this.positionHistory = [];
    this.maxHistorySize = 8;
    
    // Smoothing system
    this.targetPosition = Vector3.zero();
    this.currentAim = Vector3.zero();
    
    // Performance optimization
    this.frameCount = 0;
    this.skipFrames = 0; // For dynamic frame skipping
  }
  
  updateMovementTracking(currentPos) {
    const now = Date.now();
    const dt = Math.max((now - this.lastTime) / 1000, 0.001);
    
    if (this.prevHeadPos && dt > 0) {
      // Calculate velocity and acceleration
      const newVelocity = currentPos.subtract(this.prevHeadPos).multiplyScalar(1 / dt);
      this.acceleration = newVelocity.subtract(this.velocity).multiplyScalar(1 / dt);
      this.prevVelocity = this.velocity.clone();
      this.velocity = newVelocity;
      
      // Update position history
      this.positionHistory.push({
        pos: currentPos.clone(),
        vel: this.velocity.clone(),
        time: now
      });
      
      if (this.positionHistory.length > this.maxHistorySize) {
        this.positionHistory.shift();
      }
    }
    
    this.prevHeadPos = currentPos.clone();
    this.lastTime = now;
  }
  
  predictFuturePosition(currentPos, predictionTime = 0.05) {
    // Advanced prediction using velocity and acceleration
    const velPrediction = this.velocity.multiplyScalar(predictionTime * this.profile.predictionFactor);
    const accelPrediction = this.acceleration.multiplyScalar(0.5 * predictionTime * predictionTime);
    
    return currentPos.add(velPrediction).add(accelPrediction);
  }
  
  trackWithKalman(pos) {
    const velocityMagnitude = this.velocity.magnitude();
    
    return new Vector3(
      this.kalmanX.filter(pos.x, velocityMagnitude),
      this.kalmanY.filter(pos.y, velocityMagnitude),
      this.kalmanZ.filter(pos.z, velocityMagnitude)
    );
  }
  
  applyAdvancedRecoilCompensation(tracked, recoil) {
    // Dynamic recoil compensation based on weapon profile
    const recoilCompensation = recoil.multiplyScalar(this.profile.recoilSmooth);
    const velocityCompensation = this.velocity.multiplyScalar(this.profile.velocityCompensation * 0.01);
    
    return tracked.subtract(recoilCompensation).add(velocityCompensation);
  }
  
  applyEnhancedDragSensitivity(current, target) {
    const distance = current.distance(target);
    const delta = target.subtract(current);
    
    // Dynamic sensitivity based on distance and velocity
    let dynamicSensitivity = this.profile.dragSensitivity;
    
    // Increase sensitivity for close targets
    if (distance < this.profile.snapThreshold) {
      dynamicSensitivity *= 2.0; // Instant snap for very close targets
    } else {
      // Scale sensitivity based on target velocity
      const velocityFactor = Math.min(this.velocity.magnitude() * 10 + 1, 3.0);
      dynamicSensitivity *= velocityFactor;
    }
    
    return current.add(delta.multiplyScalar(dynamicSensitivity));
  }
  
  applySmoothingFilter(newTarget) {
    // Smooth aim movement to prevent jittery aiming
    const smoothingFactor = this.profile.smoothingFactor;
    this.targetPosition = this.targetPosition.lerp(newTarget, smoothingFactor);
    return this.targetPosition;
  }
  
  shouldSkipFrame() {
    // Dynamic frame skipping for performance optimization
    this.frameCount++;
    const velocityMagnitude = this.velocity.magnitude();
    
    if (velocityMagnitude < 0.01 && this.frameCount % 2 === 0) {
      return true; // Skip every other frame for stationary targets
    }
    
    return false;
  }
  
  lockAimToBoneHead(boneHeadPos, recoilOffset, currentCrosshairPos) {
    // Performance optimization
    if (this.shouldSkipFrame()) {
      return;
    }
    
    // Update movement tracking
    this.updateMovementTracking(boneHeadPos);
    
    // Predict future position
    const predictedPos = this.predictFuturePosition(boneHeadPos);
    
    // Apply Kalman filtering
    const tracked = this.trackWithKalman(predictedPos);
    
    // Apply advanced recoil compensation
    const recoilAdjusted = this.applyAdvancedRecoilCompensation(tracked, recoilOffset);
    
    // Apply enhanced drag sensitivity
    const dragAdjusted = this.applyEnhancedDragSensitivity(currentCrosshairPos, recoilAdjusted);
    
    // Apply smoothing filter
    const smoothedTarget = this.applySmoothingFilter(dragAdjusted);
    
    // Set final aim position
    this.setAim(smoothedTarget);
  }
  
  setAim(vec3) {
    this.currentAim = vec3.clone();
    
    // Enhanced debug output
    const velocity = this.velocity.magnitude();
    const distance = this.currentAim.distance(this.prevHeadPos || Vector3.zero());
    
    console.log(`🎯 Enhanced M1887 Lock | Pos: (${vec3.x.toFixed(4)}, ${vec3.y.toFixed(4)}, ${vec3.z.toFixed(4)}) | Vel: ${velocity.toFixed(3)} | Dist: ${distance.toFixed(4)}`);
    
    // Uncomment for real implementation
    // GameAPI.setCrosshair(vec3.x, vec3.y, vec3.z);
  }
  
  // Additional utility methods
  getAimAccuracy() {
    if (!this.prevHeadPos) return 0;
    const distance = this.currentAim.distance(this.prevHeadPos);
    return Math.max(0, 1 - distance * 10); // Accuracy percentage
  }
  
  resetTracking() {
    this.kalmanX = new AdaptiveKalmanFilter(0.003, 0.0005);
    this.kalmanY = new AdaptiveKalmanFilter(0.003, 0.0005);
    this.kalmanZ = new AdaptiveKalmanFilter(0.003, 0.0005);
    this.positionHistory = [];
    this.velocity = Vector3.zero();
    this.acceleration = Vector3.zero();
  }
}

// == Enhanced Simulation Loop ==
const bone_Head = new Vector3(-0.0456970781, -0.004478302, -0.0200432576);
let recoil = new Vector3(0, 0, 0);
let currentCrosshair = new Vector3(0, 0, 0);

// Create enhanced aimlock instance for M1887
const enhancedAimLock = new EnhancedAimLockToHead("M1887");

// Performance monitoring
let frameTime = Date.now();
let fps = 0;

function runEnhancedAimLoop() {
  // FPS calculation
  const now = Date.now();
  fps = 1000 / (now - frameTime);
  frameTime = now;
  
  // Simulate dynamic target movement (for testing)
  const time = now / 1000;
  const dynamicTarget = new Vector3(
    bone_Head.x + Math.sin(time * 2) * 0.01,
    bone_Head.y + Math.cos(time * 1.5) * 0.008,
    bone_Head.z + Math.sin(time * 0.8) * 0.005
  );
  
  // Simulate recoil pattern (for testing)
  recoil = new Vector3(
    Math.random() * 0.002 - 0.001,
    Math.random() * 0.003 - 0.0015,
    0
  );
  
  // Run enhanced aimlock
  enhancedAimLock.lockAimToBoneHead(dynamicTarget, recoil, currentCrosshair);
  
  // Performance info every 60 frames
  if (enhancedAimLock.frameCount % 60 === 0) {
    console.log(`📊 Performance: ${fps.toFixed(1)} FPS | Accuracy: ${(enhancedAimLock.getAimAccuracy() * 100).toFixed(1)}%`);
  }
  
  // High-performance loop (120 FPS)
  setTimeout(runEnhancedAimLoop, 8);
}

// Start the enhanced aimlock system
console.log("🚀 Starting Enhanced M1887 Aimlock System...");
runEnhancedAimLoop();
