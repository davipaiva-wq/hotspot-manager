export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Retorna data UTC (YYYY-MM-DD) — alinha com contagem Starlink
export function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Alias mantido para compatibilidade
export function todayDateUTC(): string {
  return todayDate();
}

export function percentUsed(consumed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((consumed / total) * 100));
}
