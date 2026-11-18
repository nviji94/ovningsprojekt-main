import { db } from "../db";
import { Result, ok, err } from "../result";

export type OrderLineInput = { product: string; quantity: number; unitPrice: number };

export type Order = {
  id: number;
  customerId: number;
  status: string;
  discountCode: string | null;
  lines: { product: string; quantity: number; unitPrice: string }[];
};

function validateLines(lines: unknown): Result<OrderLineInput[]> {
  if (!Array.isArray(lines) || lines.length === 0) {
    return err("invalid_input", "En beställning måste ha minst en rad.");
  }
  for (const line of lines) {
    if (
      typeof line?.product !== "string" ||
      !Number.isInteger(line?.quantity) ||
      line.quantity <= 0 ||
      typeof line?.unitPrice !== "number" ||
      line.unitPrice < 0
    ) {
      return err("invalid_input", "Varje rad behöver product, quantity (> 0) och unitPrice.");
    }
  }
  return ok(lines as OrderLineInput[]);
}

export async function createOrder(
  customerId: number,
  input: { lines?: unknown; discountCode?: unknown },
): Promise<Result<Order>> {
  const lines = validateLines(input.lines);
  if (!lines.ok) return lines;
  const discountCode = typeof input.discountCode === "string" ? input.discountCode : null;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const order = await client.query(
      "INSERT INTO orders (customer_id, discount_code) VALUES ($1, $2) RETURNING id",
      [customerId, discountCode],
    );
    const orderId: number = order.rows[0].id;
    for (const line of lines.value) {
      await client.query(
        "INSERT INTO order_lines (order_id, product, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [orderId, line.product, line.quantity, line.unitPrice],
      );
    }
    await client.query("COMMIT");
    return getOrder(orderId, customerId);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getOrder(orderId: number, customerId: number): Promise<Result<Order>> {
  const res = await db.query(
    `SELECT id, customer_id AS "customerId", status, discount_code AS "discountCode"
       FROM orders WHERE id = $1`,
    [orderId],
  );
  if (res.rowCount === 0) {
    return err("not_found", `Beställning ${orderId} finns inte.`);
  }
  const order = res.rows[0];
  if (order.customerId !== customerId) {
    return err("forbidden", "Beställningen tillhör en annan kund.");
  }
  const lines = await db.query(
    `SELECT product, quantity, unit_price AS "unitPrice"
       FROM order_lines WHERE order_id = $1 ORDER BY id`,
    [orderId],
  );
  return ok({ ...order, lines: lines.rows });
}

// Själva UPDATE:n. Ägare, status och tid kontrolleras i samma villkor, så att två avbrott
// inte kan lyckas samtidigt och en kund inte kan avbryta någon annans beställning.
// Returnerar antalet uppdaterade rader (0 eller 1).
export async function markCancelled(orderId: number, customerId: number): Promise<number> {
  const res = await db.query(
    `UPDATE orders SET status = 'cancelled'
      WHERE id = $1 AND customer_id = $2 AND status = 'new' AND created_at >= now() - interval '30 minutes'
      RETURNING id`,
    [orderId, customerId],
  );
  return res.rowCount ?? 0;
}

// Avbryter en egen beställning som är ny och högst 30 minuter gammal.
export async function cancelOrder(orderId: number, customerId: number): Promise<Result<Order>> {
  const found = await getOrder(orderId, customerId);
  if (!found.ok) return found;

  const updated = await markCancelled(orderId, customerId);
  if (updated === 0) {
    // Ingen rad uppdaterades: antingen har statusen ändrats, eller så är beställningen för gammal.
    if (found.value.status !== "new") {
      return err(
        "conflict",
        `Beställningen har status ${found.value.status} och kan inte avbrytas.`,
      );
    }
    return err("conflict", "Beställningen är äldre än 30 minuter och kan inte avbrytas.");
  }
  return getOrder(orderId, customerId);
}
