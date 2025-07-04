// == Vector3 + Kalman ==
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  static zero() { return new Vector3(0, 0, 0); }
}

class KalmanFilter {
  constructor(R = 0.01, Q = 0.001) {
    this.R = R; this.Q = Q; this.A = 1; this.C = 1;
    this.x = NaN; this.cov = NaN;
  }

  filter(z) {
    if (isNaN(this.x)) {
      this.x = z; this.cov = this.R;
    } else {
      const predX = this.A * this.x;
      const predCov = this.cov + this.Q;
      const K = predCov * this.C / (this.C * predCov * this.C + this.R);
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }
    return this.x;
  }
}

// == Weapon Profiles ==
const WeaponProfiles = {
  "M1887": { recoilSmooth: 1.0, dragSensitivity: 2.6, aimLockStrength: 1.8, accuracyBoost: 1.9 },
  "DEFAULT": { recoilSmooth: 0.8, dragSensitivity: 2.0, aimLockStrength: 2.0, accuracyBoost: 2.0 }
};

// == AimLock System ==
class AimLockToHead {
  constructor(weapon = "DEFAULT") {
    this.weapon = weapon;
    this.profile = WeaponProfiles[weapon] || WeaponProfiles["DEFAULT"];
    this.kalmanX = new KalmanFilter();
    this.kalmanY = new KalmanFilter();
    this.kalmanZ = new KalmanFilter();
    this.prevHeadPos = null;
    this.velocity = Vector3.zero();
    this.lastTime = Date.now();
  }

  updateVelocity(currentPos) {
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    if (this.prevHeadPos && dt > 0) {
      this.velocity = currentPos.subtract(this.prevHeadPos).multiplyScalar(1 / dt);
    }
    this.prevHeadPos = currentPos.clone();
    this.lastTime = now;
  }

  trackKalman(pos) {
    return new Vector3(
      this.kalmanX.filter(pos.x),
      this.kalmanY.filter(pos.y),
      this.kalmanZ.filter(pos.z)
    );
  }

  applyRecoilOffset(tracked, recoil) {
    return tracked.subtract(recoil.multiplyScalar(this.profile.recoilSmooth));
  }

  applyDragSensitivity(current, target) {
    const delta = target.subtract(current);
    return current.add(delta.multiplyScalar(this.profile.dragSensitivity));
  }

  lockAimToBoneHead(boneHeadPos, recoilOffset, currentCrosshairPos) {
    this.updateVelocity(boneHeadPos);
    const tracked = this.trackKalman(boneHeadPos);
    const recoilAdjusted = this.applyRecoilOffset(tracked, recoilOffset);
    const aimTarget = this.applyDragSensitivity(currentCrosshairPos, recoilAdjusted);
    this.setAim(aimTarget);
  }

  setAim(vec3) {
    console.log("🎯 Aim Locked to Head:", vec3.x.toFixed(5), vec3.y.toFixed(5), vec3.z.toFixed(5));
    // GameAPI.setCrosshair(vec3.x, vec3.y, vec3.z); // Uncomment if using real API
  }
}

// == Simulate Bone Head Position + Loop ==
const bone_Head = new Vector3(-0.0456970781, -0.004478302, -0.0200432576); // center bone_Head
const recoil = new Vector3(0, 0, 0); // Update in-game
const currentCrosshair = new Vector3(0, 0, 0);

const aimLock = new AimLockToHead("M1887"); // chọn vũ khí

function runAimLoop() {
  aimLock.lockAimToBoneHead(bone_Head, recoil, currentCrosshair);
  setTimeout(runAimLoop, 16); // 60fps
}
runAimLoop();
