import request from "supertest";
import { createApp } from "../src/app";
import { db } from "../src/db";
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
  });

  it("returnerar 409 för en beställning som är äldre än 30 minuter", async () => {
    // Seed-beställning 1043 är ny men skapad i oktober, alltså för gammal.
    const res = await request(app).post("/orders/1043/cancel").set("X-Customer-Id", "3");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");
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
    expect(res.body.error.message).toBe("Beställningen kan inte avbrytas.");

    const after = await request(app).get(`/orders/${created.body.id}`).set("X-Customer-Id", "3");
    expect(after.body.status).toBe("paid");
  });

  it("returnerar 403 för en annan kunds beställning", async () => {
    // Beställning 1043 tillhör kund 3, inte kund 2.
    const res = await request(app).post("/orders/1043/cancel").set("X-Customer-Id", "2");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("returnerar 404 för en beställning som inte finns", async () => {
    const res = await request(app).post("/orders/9999/cancel").set("X-Customer-Id", "1");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("returnerar 401 utan inloggning", async () => {
    const res = await request(app).post("/orders/1043/cancel");
    expect(res.status).toBe(401);
  });

  it("returnerar 400 för ett ogiltigt id", async () => {
    const res = await request(app).post("/orders/abc/cancel").set("X-Customer-Id", "3");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_input");
  });
});

describe("GET /orders/:id/price", () => {
  it("räknar pris med moms via den äldre modulen", async () => {
    const res = await request(app).get("/orders/1042/price").set("X-Customer-Id", "1");
    expect(res.status).toBe(200);
    expect(Number(res.body.total)).toBe(1187.5);
  });
});
