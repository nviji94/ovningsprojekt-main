import request from "supertest";
import { createApp } from "../src/app";
import { db } from "../src/db";
import { markCancelled } from "../src/services/orderService";
import { closeDb, resetDb } from "./helpers/db";

const app = createApp();

beforeEach(resetDb);
afterAll(closeDb);

describe("POST /orders", () => {
  it("lägger en beställning med rader", async () => {
    const res = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 2, unitPrice: 200 }] });
    expect(res.status).toBe(201);
    expect(res.body.customerId).toBe(3);
    expect(res.body.status).toBe("new");
    expect(res.body.lines).toEqual([{ product: "Musmatta", quantity: 2, unitPrice: "200.00" }]);
  });

  it("returnerar 400 utan rader", async () => {
    const res = await request(app).post("/orders").set("X-Customer-Id", "3").send({ lines: [] });
    expect(res.status).toBe(400);
  });

  it("returnerar 400 när antalet inte är positivt", async () => {
    const res = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 0, unitPrice: 200 }] });
    expect(res.status).toBe(400);
  });

  it("returnerar 401 utan inloggning", async () => {
    const res = await request(app).post("/orders").send({ lines: [] });
    expect(res.status).toBe(401);
  });
});

describe("GET /orders/:id", () => {
  it("returnerar en egen beställning med rader", async () => {
    const res = await request(app).get("/orders/1042").set("X-Customer-Id", "1");
    expect(res.status).toBe(200);
    expect(res.body.lines).toHaveLength(2);
  });

  it("returnerar 403 för en annan kunds beställning", async () => {
    const res = await request(app).get("/orders/1042").set("X-Customer-Id", "2");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("returnerar 404 för en beställning som inte finns", async () => {
    const res = await request(app).get("/orders/9999").set("X-Customer-Id", "1");
    expect(res.status).toBe(404);
  });

  it("returnerar 400 för ett ogiltigt id", async () => {
    const res = await request(app).get("/orders/abc").set("X-Customer-Id", "1");
    expect(res.status).toBe(400);
  });
});

describe("POST /orders/:id/cancel", () => {
  it("avbryter en egen ny beställning", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
    const res = await request(app)
      .post(`/orders/${created.body.id}/cancel`)
      .set("X-Customer-Id", "3");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.lines).toEqual(created.body.lines);
  });

  it("returnerar 409 för en beställning som är äldre än 30 minuter", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
    // created_at sätts 31 minuter bakåt direkt i testdatabasen.
    await db.query("UPDATE orders SET created_at = now() - interval '31 minutes' WHERE id = $1", [
      created.body.id,
    ]);

    const res = await request(app)
      .post(`/orders/${created.body.id}/cancel`)
      .set("X-Customer-Id", "3");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");
    expect(res.body.error.message).toBe(
      "Beställningen är äldre än 30 minuter och kan inte avbrytas.",
    );

    const after = await request(app).get(`/orders/${created.body.id}`).set("X-Customer-Id", "3");
    expect(after.body.status).toBe("new");
  });

  it("returnerar 409 för en ny beställning med annan status än new", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
    await db.query("UPDATE orders SET status = 'paid' WHERE id = $1", [created.body.id]);

    const res = await request(app)
      .post(`/orders/${created.body.id}/cancel`)
      .set("X-Customer-Id", "3");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");
    expect(res.body.error.message).toBe("Beställningen har status paid och kan inte avbrytas.");

    const after = await request(app).get(`/orders/${created.body.id}`).set("X-Customer-Id", "3");
    expect(after.body.status).toBe("paid");
  });

  it.each(["cancelled", "shipped"])(
    "returnerar 409 för en ung beställning med status %s och ändrar inte status",
    async (status) => {
      const created = await request(app)
        .post("/orders")
        .set("X-Customer-Id", "3")
        .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
      // Status och created_at sätts direkt i testdatabasen. Beställningen är yngre än 30 minuter.
      await db.query("UPDATE orders SET status = $2, created_at = now() WHERE id = $1", [
        created.body.id,
        status,
      ]);

      const res = await request(app)
        .post(`/orders/${created.body.id}/cancel`)
        .set("X-Customer-Id", "3");
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("conflict");
      expect(res.body.error.message).toBe(
        `Beställningen har status ${status} och kan inte avbrytas.`,
      );

      const after = await request(app).get(`/orders/${created.body.id}`).set("X-Customer-Id", "3");
      expect(after.body.status).toBe(status);
    },
  );

  it("avbryter en egen ny beställning som är 29 minuter gammal", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
    // created_at sätts 29 minuter bakåt direkt i testdatabasen.
    await db.query("UPDATE orders SET created_at = now() - interval '29 minutes' WHERE id = $1", [
      created.body.id,
    ]);

    const res = await request(app)
      .post(`/orders/${created.body.id}/cancel`)
      .set("X-Customer-Id", "3");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("returnerar 409 för en egen ny beställning som är 31 minuter gammal", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });
    // created_at sätts 31 minuter bakåt direkt i testdatabasen.
    await db.query("UPDATE orders SET created_at = now() - interval '31 minutes' WHERE id = $1", [
      created.body.id,
    ]);

    const res = await request(app)
      .post(`/orders/${created.body.id}/cancel`)
      .set("X-Customer-Id", "3");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");

    const after = await request(app).get(`/orders/${created.body.id}`).set("X-Customer-Id", "3");
    expect(after.body.status).toBe("new");
  });

  it("returnerar 403 för en annan kunds beställning", async () => {
    // Beställning 1043 tillhör kund 3, inte kund 2.
    const before = await request(app).get("/orders/1043").set("X-Customer-Id", "3");
    const res = await request(app).post("/orders/1043/cancel").set("X-Customer-Id", "2");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");

    const after = await request(app).get("/orders/1043").set("X-Customer-Id", "3");
    expect(after.body.status).toBe(before.body.status);
  });

  it("returnerar 404 för en beställning som inte finns", async () => {
    const res = await request(app).post("/orders/9999/cancel").set("X-Customer-Id", "1");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("returnerar 401 utan inloggning", async () => {
    const before = await request(app).get("/orders/1043").set("X-Customer-Id", "3");
    const res = await request(app).post("/orders/1043/cancel");
    expect(res.status).toBe(401);

    const after = await request(app).get("/orders/1043").set("X-Customer-Id", "3");
    expect(after.body.status).toBe(before.body.status);
  });

  it("returnerar 400 för ett ogiltigt id", async () => {
    const res = await request(app).post("/orders/abc/cancel").set("X-Customer-Id", "3");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_input");
  });
});

describe("markCancelled: ägarskydd i UPDATE", () => {
  it("ändrar inte en annan kunds beställning, även när getOrder förbigås", async () => {
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });

    // Anropar UPDATE-logiken direkt, utan ägarkontrollen i getOrder.
    const updated = await markCancelled(created.body.id, 2);
    expect(updated).toBe(0);

    const row = await db.query("SELECT status FROM orders WHERE id = $1", [created.body.id]);
    expect(row.rows[0].status).toBe("new");
  });

  it("avbryter beställningen när kund-id stämmer", async () => {
    // Positiv kontroll: samma anrop med rätt kund ska uppdatera raden.
    const created = await request(app)
      .post("/orders")
      .set("X-Customer-Id", "3")
      .send({ lines: [{ product: "Musmatta", quantity: 1, unitPrice: 200 }] });

    const updated = await markCancelled(created.body.id, 3);
    expect(updated).toBe(1);

    const row = await db.query("SELECT status FROM orders WHERE id = $1", [created.body.id]);
    expect(row.rows[0].status).toBe("cancelled");
  });
});

describe("GET /orders/:id/price", () => {
  it("räknar pris med moms via den äldre modulen", async () => {
    const res = await request(app).get("/orders/1042/price").set("X-Customer-Id", "1");
    expect(res.status).toBe(200);
    expect(Number(res.body.total)).toBe(1187.5);
  });
});
