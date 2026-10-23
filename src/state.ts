// DeLab 检查模式状态机

export enum InspectState {
  IDLE = 'idle',
  INSPECTING = 'inspecting',
  LOCKED = 'locked',
}

export class InspectStateManager {
  private state: InspectState = InspectState.IDLE;

  getState(): InspectState {
    return this.state;
  }

  setState(state: InspectState) {
    this.state = state;
  }

  isInspecting(): boolean {
    return this.state !== InspectState.IDLE;
  }

  reset() {
    this.state = InspectState.IDLE;
  }
}
