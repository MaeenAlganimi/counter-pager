import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const fields =
  "id,slug,name,name_ar,logo_url,primary_color,accent_color,google_review_url,currency";
const enc = new TextEncoder();
const b64 = (v: Uint8Array) =>
  btoa(String.fromCharCode(...v))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const un64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const json64 = (v: unknown) => b64(enc.encode(JSON.stringify(v)));
const sha = async (s: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function checked<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) {
    console.error(r.error);
    fail("Database operation failed", 500);
  }
  return r.data as NonNullable<T>;
}
async function secrets() {
  const rows = checked(await db.from("pager_secrets").select("key,value"));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
async function hkey(secret: string) {
  if (!secret) fail("Server token secret is not configured", 503);
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function authenticate(token: string, secret: string) {
  try {
    const [p, s, ...extra] = token.split(".");
    if (
      extra.length ||
      !(await crypto.subtle.verify(
        "HMAC",
        await hkey(secret),
        un64(s),
        enc.encode(p),
      ))
    )
      fail("Please sign in again", 401);
    const data = JSON.parse(new TextDecoder().decode(un64(p)));
    if (
      typeof data.business_id !== "string" ||
      !Number.isFinite(data.exp) ||
      data.exp <= Date.now() / 1000
    )
      fail("Session expired", 401);
    return data.business_id as string;
  } catch {
    fail("Please sign in again", 401);
  }
}
async function broadcast(id: string, business: string) {
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { topic: "ticket-" + id, event: "update", payload: {} },
          { topic: "biz-" + business, event: "update", payload: {} },
        ],
      }),
    });
    if (!res.ok) console.error("Broadcast failed", res.status);
  } catch (error) {
    console.error("Broadcast unavailable", error);
  }
}
async function notify(t: any, b: any, s: Record<string, string>) {
  if (!s.vapid_public || !s.vapid_private || !s.vapid_subject) return;
  webpush.setVapidDetails(s.vapid_subject, s.vapid_public, s.vapid_private);
  const mins = Math.max(
    0,
    Math.ceil((Date.parse(t.eta_at) - Date.now()) / 60000),
  );
  const body = `Order #${String(t.number).padStart(3, "0")} · ${t.status === "ready" ? "Ready for pickup" : t.status === "done" ? "Picked up. Enjoy!" : t.eta_at ? `Ready at ~${new Date(t.eta_at).toISOString().slice(11, 16)} (${mins} min)` : "Your order is being prepared"}`;
  const rows = checked(
    await db.from("pager_push_subs").select("*").eq("ticket_id", t.id),
  );
  await Promise.allSettled(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: b.name,
            body,
            tag: "order-" + t.id,
            renotify: true,
            url: "/t/" + t.id,
            status: t.status,
            eta_at: t.eta_at,
          }),
          { TTL: 3600 },
        );
      } catch (e) {
        if ([404, 410].includes((e as any).statusCode))
          checked(await db.from("pager_push_subs").delete().eq("id", sub.id));
        else console.error("Push failed", (e as any).statusCode);
      }
    }),
  );
}
async function googleWallet(
  t: any,
  b: any,
  s: Record<string, string>,
  origin: string,
) {
  if (!s.google_wallet_issuer_id || !s.google_wallet_service_account_json)
    return { available: false, reason: "Google Wallet is not configured" };
  const account = JSON.parse(s.google_wallet_service_account_json);
  const pem = account.private_key
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    un64(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const object = {
    id: `${s.google_wallet_issuer_id}.order_${t.id.replace(/-/g, "")}`,
    classId: `${s.google_wallet_issuer_id}.pager_orders`,
    state: "ACTIVE",
    hexBackgroundColor: b.primary_color || "#193cba",
    cardTitle: { defaultValue: { language: "en", value: b.name } },
    header: {
      defaultValue: {
        language: "en",
        value: `Order #${String(t.number).padStart(3, "0")}`,
      },
    },
    subheader: {
      defaultValue: {
        language: "en",
        value: t.status === "ready" ? "Ready for pickup" : "Track your order",
      },
    },
    barcode: {
      type: "QR_CODE",
      value: `${s.public_app_url || origin}/t/${t.id}`,
    },
    textModulesData: [
      { id: "status", header: "Status", body: t.status },
      {
        id: "eta",
        header: "Estimated pickup",
        body: t.eta_at || "Ask the team",
      },
    ],
  };
  const data =
    json64({ alg: "RS256", typ: "JWT" }) +
    "." +
    json64({
      iss: account.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        genericClasses: [{ id: `${s.google_wallet_issuer_id}.pager_orders` }],
        genericObjects: [object],
      },
    });
  const jwt =
    data +
    "." +
    b64(
      new Uint8Array(
        await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(data)),
      ),
    );
  return { available: true, url: "https://pay.google.com/gp/v/save/" + jwt };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  try {
    if (req.method !== "POST") return reply({ error: "Use POST" }, 405);
    const a = await req.json();
    const s = await secrets();
    if (a.action === "business") {
      const b = checked(
        await db
          .from("pager_businesses")
          .select(fields)
          .eq("slug", a.slug)
          .single(),
      );
      return reply({ business: b, vapid_public: s.vapid_public || null });
    }
    if (a.action === "staff_login") {
      if (!/^\d{4,12}$/.test(a.pin || "")) fail("Enter a valid PIN", 401);
      const { data: b } = await db
        .from("pager_businesses")
        .select("id,slug,staff_pin_hash")
        .eq("slug", a.slug)
        .single();
      if (!b || b.staff_pin_hash !== (await sha(b.slug + ":" + a.pin)))
        fail("Incorrect PIN", 401);
      const p = json64({
        business_id: b.id,
        exp: Math.floor(Date.now() / 1000) + 43200,
      });
      return reply({
        token:
          p +
          "." +
          b64(
            new Uint8Array(
              await crypto.subtle.sign(
                "HMAC",
                await hkey(s.token_secret),
                enc.encode(p),
              ),
            ),
          ),
      });
    }
    const customer = [
      "ticket",
      "subscribe",
      "rate",
      "google_wallet",
      "apple_wallet",
    ].includes(a.action);
    let bid: string;
    let ticket: any;
    if (customer) {
      if (!/^[0-9a-f-]{36}$/i.test(a.ticket_id || "")) fail("Invalid ticket");
      ticket = checked(
        await db
          .from("pager_tickets")
          .select("*")
          .eq("id", a.ticket_id)
          .single(),
      );
      bid = ticket.business_id;
    } else bid = await authenticate(a.token || "", s.token_secret);
    const b = checked(
      await db.from("pager_businesses").select(fields).eq("id", bid).single(),
    );
    if (a.action === "ticket") {
      const { feedback, ...publicTicket } = ticket;
      return reply({
        ticket: publicTicket,
        business: b,
        vapid_public: s.vapid_public || null,
      });
    }
    if (a.action === "google_wallet")
      return reply(
        await googleWallet(ticket, b, s, req.headers.get("Origin") || ""),
      );
    if (a.action === "apple_wallet")
      return reply({
        available: false,
        reason:
          "Apple pass signing requires the Node signer in wallet/apple; deploy it before enabling passes",
      });
    if (a.action === "subscribe") {
      const sub = a.subscription;
      if (!sub?.keys?.p256dh || !sub?.keys?.auth)
        fail("Invalid push subscription");
      const endpoint = new URL(sub.endpoint);
      if (
        endpoint.protocol !== "https:" ||
        !/(^|\.)(push\.services\.mozilla\.com|googleapis\.com|fcm\.googleapis\.com|web\.push\.apple\.com|notify\.windows\.com)$/.test(
          endpoint.hostname,
        )
      )
        fail("Unsupported push endpoint");
      checked(
        await db.from("pager_push_subs").upsert(
          {
            ticket_id: ticket.id,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
          { onConflict: "endpoint" },
        ),
      );
      return reply({ ok: true });
    }
    if (a.action === "rate") {
      if (
        ticket.status !== "done" ||
        !Number.isInteger(a.rating) ||
        a.rating < 1 ||
        a.rating > 5
      )
        fail("Choose a rating for a completed order");
      checked(
        await db
          .from("pager_tickets")
          .update({
            rating: a.rating,
            ...(typeof a.feedback === "string"
              ? { feedback: a.feedback.slice(0, 4000) }
              : {}),
          })
          .eq("id", ticket.id),
      );
      await broadcast(ticket.id, bid);
      return reply({ ok: true });
    }
    if (a.action === "list") {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const rows = checked(
        await db
          .from("pager_tickets")
          .select("*")
          .eq("business_id", bid)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false }),
      );
      const called = rows.filter((t) => t.called_at);
      const waits = called.map(
        (t) => (Date.parse(t.called_at) - Date.parse(t.created_at)) / 60000,
      );
      const rated = rows.filter((t) => t.rating);
      return reply({
        tickets: rows,
        stats: {
          completed: rows.filter((t) => t.status === "done").length,
          avg_wait: waits.length
            ? waits.reduce((a, b) => a + b, 0) / waits.length
            : null,
          longest_wait: waits.length ? Math.max(...waits) : null,
          avg_rating: rated.length
            ? rated.reduce((a, t) => a + t.rating, 0) / rated.length
            : null,
          on_time: called.length
            ? (100 *
                called.filter(
                  (t) =>
                    t.eta_at && Date.parse(t.called_at) <= Date.parse(t.eta_at),
                ).length) /
              called.length
            : null,
        },
      });
    }
    if (a.action === "branding") {
      const values: Record<string, unknown> = {};
      for (const k of [
        "name",
        "name_ar",
        "logo_url",
        "primary_color",
        "accent_color",
        "google_review_url",
        "currency",
      ])
        if (a[k] !== undefined) values[k] = a[k];
      if (values.name !== undefined && !String(values.name).trim())
        fail("Business name is required");
      for (const k of ["logo_url", "google_review_url"])
        if (values[k] && !/^https?:\/\//.test(String(values[k])))
          fail("Use an HTTP or HTTPS URL");
      for (const k of ["primary_color", "accent_color"])
        if (values[k] && !/^#[\da-f]{6}$/i.test(String(values[k])))
          fail("Invalid colour");
      if (values.currency && !/^[A-Z]{3}$/.test(String(values.currency)))
        fail("Use a three-letter currency code");
      return reply({
        business: checked(
          await db
            .from("pager_businesses")
            .update(values)
            .eq("id", bid)
            .select(fields)
            .single(),
        ),
      });
    }
    if (a.action === "create") {
      if (!Array.isArray(a.items) || a.items.length > 100)
        fail("Invalid items");
      const items = a.items.map((i: any) => {
        if (
          typeof i.name !== "string" ||
          !i.name.trim() ||
          i.name.length > 200 ||
          !Number.isInteger(i.qty) ||
          i.qty < 1 ||
          i.qty > 1000 ||
          (i.price !== undefined && (!Number.isFinite(i.price) || i.price < 0))
        )
          fail("Invalid item");
        return {
          name: i.name.trim(),
          qty: i.qty,
          ...(i.price !== undefined ? { price: i.price } : {}),
        };
      });
      const eta = Number(a.eta_minutes);
      if (!Number.isFinite(eta) || eta < 1 || eta > 1440)
        fail("ETA must be between 1 and 1440 minutes");
      const amount =
        a.amount ??
        items.reduce((sum: number, i: any) => sum + i.qty * (i.price || 0), 0);
      if (!Number.isFinite(amount) || amount < 0) fail("Invalid total");
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const max = checked(
        await db
          .from("pager_tickets")
          .select("number")
          .eq("business_id", bid)
          .gte("created_at", start.toISOString())
          .order("number", { ascending: false })
          .limit(1),
      );
      ticket = checked(
        await db
          .from("pager_tickets")
          .insert({
            business_id: bid,
            number: (max[0]?.number || 0) + 1,
            note: String(a.note || "").slice(0, 2000),
            items,
            amount,
            eta_at: new Date(Date.now() + eta * 60000).toISOString(),
            status: "waiting",
          })
          .select()
          .single(),
      );
      await broadcast(ticket.id, bid);
      return reply({ ticket });
    }
    if (["set_status", "update_eta", "push_test"].includes(a.action)) {
      ticket = checked(
        await db
          .from("pager_tickets")
          .select("*")
          .eq("id", a.ticket_id)
          .eq("business_id", bid)
          .single(),
      );
      let values: Record<string, unknown> = {};
      if (a.action === "update_eta") {
        const eta = Number(a.eta_minutes);
        if (!Number.isFinite(eta) || eta < 1 || eta > 1440) fail("Invalid ETA");
        values = {
          eta_at: new Date(Date.now() + eta * 60000).toISOString(),
          eta_updated_at: new Date().toISOString(),
        };
      }
      if (a.action === "set_status") {
        if (
          !["waiting", "ready", "done", "cancelled", "recall"].includes(
            a.status,
          )
        )
          fail("Invalid status");
        if (a.status === "recall" && ticket.status !== "ready")
          fail("Only ready orders can be recalled");
        values = { status: a.status === "recall" ? "ready" : a.status };
        if (["ready", "recall"].includes(a.status))
          values.called_at = new Date().toISOString();
        if (a.status === "done") values.completed_at = new Date().toISOString();
      }
      if (Object.keys(values).length)
        ticket = checked(
          await db
            .from("pager_tickets")
            .update(values)
            .eq("id", ticket.id)
            .eq("business_id", bid)
            .select()
            .single(),
        );
      await broadcast(ticket.id, bid);
      if (
        a.action !== "set_status" ||
        ["ready", "recall", "done"].includes(a.status)
      )
        await notify(ticket, b, s).catch((error) =>
          console.error("Push unavailable", error),
        );
      return reply({ ticket });
    }
    fail("Unknown action");
  } catch (e) {
    console.error((e as Error).message);
    return reply(
      { error: (e as Error).message || "Request failed" },
      (e as any).status || 400,
    );
  }
});
