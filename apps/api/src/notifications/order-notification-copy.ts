export function formatClp(amountClp: number): string {
  return `$${amountClp.toLocaleString("es-CL")}`;
}

export function orderCardLabel(items: Array<{ titleSnapshot: string }>): string {
  const first = items[0]?.titleSnapshot?.trim() || "tu pedido";
  if (items.length <= 1) return first;
  return `${first} y ${items.length - 1} más`;
}
