/**
 * One Euro filter (Casiez, Roussel & Vogel, 2012).
 *
 * A low-pass filter whose cutoff frequency rises with the signal's velocity.
 * This removes jitter while keeping fast gaze movements responsive.
 */

function alphaFor(dtSeconds: number, cutoffHz: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / Math.max(dtSeconds, 1 / 240));
}

class LowPassFilter {
  private value: number | null = null;

  filter(next: number, alpha: number): number {
    if (this.value === null) {
      this.value = next;
      return next;
    }
    this.value = alpha * next + (1 - alpha) * this.value;
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export interface OneEuroFilterOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private readonly valueFilter = new LowPassFilter();
  private readonly derivativeFilter = new LowPassFilter();
  private lastValue = 0;
  private lastTimeMs: number | null = null;

  constructor(options: OneEuroFilterOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1.2;
    this.beta = options.beta ?? 0.035;
    this.dCutoff = options.dCutoff ?? 1.0;
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = timestampMs;
      this.lastValue = value;
      return value;
    }

    const dt = Math.min(0.25, Math.max(1 / 240, (timestampMs - this.lastTimeMs) / 1000));
    this.lastTimeMs = timestampMs;

    const derivative = (value - this.lastValue) / dt;
    this.lastValue = value;

    const smoothedDerivative = this.derivativeFilter.filter(
      derivative,
      alphaFor(dt, this.dCutoff)
    );
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);

    return this.valueFilter.filter(value, alphaFor(dt, cutoff));
  }

  reset(): void {
    this.valueFilter.reset();
    this.derivativeFilter.reset();
    this.lastTimeMs = null;
    this.lastValue = 0;
  }
}

export interface OneEuroFilter2DOptions {
  smoothing?: number;
  beta?: number;
}

export class OneEuroFilter2D {
  private readonly xFilter: OneEuroFilter;
  private readonly yFilter: OneEuroFilter;

  constructor(options: OneEuroFilter2DOptions = {}) {
    const smoothing = Math.min(1, Math.max(0, options.smoothing ?? 0.28));
    const minCutoff = 1.1 + (1 - smoothing) * 2.2;
    const beta = options.beta ?? 0.9;

    this.xFilter = new OneEuroFilter({ minCutoff, beta });
    this.yFilter = new OneEuroFilter({ minCutoff, beta });
  }

  filter(x: number, y: number, timestampMs: number): { x: number; y: number } {
    return {
      x: this.xFilter.filter(x, timestampMs),
      y: this.yFilter.filter(y, timestampMs),
    };
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}
