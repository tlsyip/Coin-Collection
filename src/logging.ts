const logs: string[] = [];
const listeners: Array<() => void> = [];

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function log(event: string) {
  const entry = `[${timestamp()}] ${event}`;
  logs.push(entry);
  if (logs.length > 200) {
    logs.shift();
  }
  listeners.forEach((listener) => listener());
}

export function getLogs() {
  return logs.slice();
}

export function clearLogs() {
  logs.length = 0;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
