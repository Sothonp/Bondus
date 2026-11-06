/* An ideal gas in a box, for the ```gas figure (kinetic theory of gases, Physics chapter 1).

   Point particles of equal mass bounce off the walls and off a piston (the right wall),
   which the student moves to change the volume. They do not collide with one another,
   as in the ideal-gas model, so each keeps the speed it was given: velocities are drawn
   from the Maxwell-Boltzmann distribution at the chosen temperature and rescaled when it
   changes. The pressure is measured, not computed: the momentum the particles give the
   walls, per unit of wall length and of time. It agrees with p = N k T / V, which is the
   point the figure makes. Two-dimensional, in units of the box (width 1 at 100 % volume,
   height 1, mass 1); a temperature of 300 K gives each velocity component a spread of
   0.25 box widths per second. visuals.test.js checks it against p = NkT/V. */

const SPREAD_AT_300K = 0.25;
const kT = (temperature) => SPREAD_AT_300K ** 2 * (temperature / 300); // m = 1

/* A small seeded generator, so a run (and its test) can be repeated exactly. */
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const gaussian = (next) => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());

export function createGas({ count = 60, temperature = 300, width = 1, height = 1, seed = 7 } = {}) {
  const next = random(seed);
  const sigma = Math.sqrt(kT(temperature));
  const particles = Array.from({ length: count }, () => ({
    x: next() * width, y: next() * height, vx: gaussian(next) * sigma, vy: gaussian(next) * sigma,
  }));
  return { particles, temperature, width, height, impulse: 0, elapsed: 0 };
}

/* Advance by dt seconds, in small steps so no particle passes through a wall. */
export function stepGas(gas, dt) {
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const p of gas.particles) {
      p.x += p.vx * h; p.y += p.vy * h;
      if (p.x < 0) { p.x = -p.x; gas.impulse += 2 * Math.abs(p.vx); p.vx = Math.abs(p.vx); }
      if (p.x > gas.width) { p.x = 2 * gas.width - p.x; gas.impulse += 2 * Math.abs(p.vx); p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = -p.y; gas.impulse += 2 * Math.abs(p.vy); p.vy = Math.abs(p.vy); }
      if (p.y > gas.height) { p.y = 2 * gas.height - p.y; gas.impulse += 2 * Math.abs(p.vy); p.vy = -Math.abs(p.vy); }
    }
    gas.elapsed += h;
  }
}

/* The pressure measured since the last reading (force per unit wall length), then reset. */
export function readPressure(gas) {
  const perimeter = 2 * (gas.width + gas.height);
  const pressure = gas.elapsed > 0 ? gas.impulse / (gas.elapsed * perimeter) : 0;
  gas.impulse = 0; gas.elapsed = 0;
  return pressure;
}

/* p = N k T / V for this box: the ideal-gas law the measurement should agree with. */
export const idealPressure = (gas) => (gas.particles.length * kT(gas.temperature)) / (gas.width * gas.height);

/* Heat or cool the gas: every speed scales by sqrt(T_new / T_old). */
export function setTemperature(gas, temperature) {
  const scale = Math.sqrt(temperature / gas.temperature);
  for (const p of gas.particles) { p.vx *= scale; p.vy *= scale; }
  gas.temperature = temperature;
}

/* Move the piston; particles it passes are pushed back inside. */
export function setWidth(gas, width) {
  gas.width = width;
  for (const p of gas.particles) if (p.x > width) { p.x = width * 0.999; p.vx = -Math.abs(p.vx); }
}

/* Mean kinetic energy per particle, which the ideal-gas model says is kT in two dimensions. */
export const meanKineticEnergy = (gas) =>
  gas.particles.reduce((sum, p) => sum + (p.vx * p.vx + p.vy * p.vy) / 2, 0) / gas.particles.length;
export const kineticEnergyAt = kT;

/* Speeds grouped into `bins` equal ranges from 0 to `top`, for the live histogram. */
export function speedHistogram(gas, bins = 12, top = 4 * Math.sqrt(kT(gas.temperature))) {
  const counts = new Array(bins).fill(0);
  for (const p of gas.particles) {
    const i = Math.min(bins - 1, Math.floor((Math.hypot(p.vx, p.vy) / top) * bins));
    counts[i] += 1;
  }
  return { counts, top };
}
