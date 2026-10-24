import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useParams } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Coffee,
  Globe2,
  Plus,
  Settings2,
  Star,
  Ticket as TicketIcon,
  X,
  Clock,
  Volume2,
  CircleCheck,
  ScanLine,
} from "lucide-react";
import { en, ar, type Key } from "./i18n";
import "./style.css";
const config = (import.meta as unknown as { env: Record<string, string> }).env;
const db =
  config.VITE_SUPABASE_URL && config.VITE_SUPABASE_ANON_KEY
    ? createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY)
    : null;
type Business = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  name_ar: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  google_review_url: string | null;
};
type Item = { name: string; qty: number; price?: number };
type Ticket = {
  items: Item[];
  amount: number | null;
  eta_at: string | null;
  eta_updated_at: string | null;
  id: string;
  business_id: string;
  number: number;
  note: string | null;
  status: "waiting" | "ready" | "done" | "cancelled";
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  rating: number | null;
  feedback: string | null;
};
async function api(action: string, values: Record<string, unknown> = {}) {
  if (!db)
    throw new Error("Configure the Supabase URL and anon key to connect.");
  const res = await fetch(
    `${config.VITE_SUPABASE_URL}/functions/v1/pager-api`,
    {
      method: "POST",
      headers: {
        apikey: config.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${config.VITE_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...values }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
const num = (n: number) => String(n).padStart(3, "0");
const time = (v: string | null) =>
  v
    ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
const money = (n: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};
function Countdown({
  ticket,
  ring = false,
}: {
  ticket: Ticket;
  ring?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = ticket.eta_at
    ? Math.ceil((Date.parse(ticket.eta_at) - now) / 1000)
    : 0;
  const span = ticket.eta_at
    ? Math.max(
        1,
        (Date.parse(ticket.eta_at) - Date.parse(ticket.created_at)) / 1000,
      )
    : 1;
  return (
    <div
      className={`${ring ? "countdown-ring" : "countdown"} ${left < 0 ? "overdue" : ""}`}
      style={
        ring
          ? {
              background: `conic-gradient(var(--primary) ${Math.max(0, Math.min(100, (left / span) * 100))}%, #e9edf8 0)`,
            }
          : undefined
      }
    >
      <div>
        <strong>
          {ticket.status === "ready"
            ? "Ready!"
            : ticket.status === "done"
              ? "Enjoy!"
              : `${left < 0 ? "+" : ""}${Math.floor(Math.abs(left) / 60)}:${String(Math.abs(left) % 60).padStart(2, "0")}`}
        </strong>
        <small>{left < 0 ? "Taking a little longer" : "until pickup"}</small>
      </div>
    </div>
  );
}
const Locale = createContext({
  lang: "en",
  t: (k: Key): string => en[k],
  toggle: () => {},
});
function useI18n() {
  return useContext(Locale);
}
function safeUrl(value: string | null) {
  if (!value) return undefined;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
function color(value: string | null, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
function Brand({ business }: { business?: Business | null }) {
  const { lang, t } = useI18n();
  return (
    <Link className="brand" to="/">
      {safeUrl(business?.logo_url || null) ? (
        <img src={safeUrl(business!.logo_url)} alt="" />
      ) : (
        <span className="brand-mark">
          <ScanLine size={23} />
        </span>
      )}
      <span>
        {business
          ? lang === "ar" && business.name_ar
            ? business.name_ar
            : business.name
          : t("brand")}
        <small>{t("tagline")}</small>
      </span>
    </Link>
  );
}
function Header({
  business,
  staff = false,
}: {
  business?: Business | null;
  staff?: boolean;
}) {
  const { t, toggle } = useI18n();
  return (
    <header className="header">
      <Brand business={business} />
      <nav>
        {!staff && (
          <Link className="nav-link" to="/b/demo-cafe/staff">
            {t("dashboard")}
            <ArrowUpRight size={15} />
          </Link>
        )}
        <button className="language" onClick={toggle}>
          <Globe2 size={17} />
          {t("language")}
        </button>
      </nav>
    </header>
  );
}
function Landing() {
  const { t } = useI18n();
  return (
    <>
      <Header />
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <div className="intro-chip">
              <span />
              {t("noApp")}
            </div>
            <h1>{t("hero")}</h1>
            <p>{t("intro")}</p>
            <Link className="button primary large" to="/b/demo-cafe/staff">
              {t("try")}
              <ArrowUpRight size={21} />
            </Link>
            <p className="demo-flow">
              Demo PIN: <strong>1234</strong>. Add an order, scan its QR on your
              phone, then tap Ready at the counter.
            </p>
            <div className="hero-foot">
              <Bell size={16} />
              {t("tagline")}
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="floating-coffee">
              <Coffee size={35} />
            </span>
            <div className="sample-ticket">
              <div className="sample-top">
                <Coffee size={22} />
                <span>{t("sampleCafe")}</span>
                <span className="tiny-dot" />
              </div>
              <div className="ticket-perf" />
              <div className="sample-body">
                <span className="ticket-label">{t("yourTicket")}</span>
                <div className="sample-number">024</div>
                <span className="status-pill">
                  <span />
                  {t("waiting")}
                </span>
                <p>{t("sampleNote")}</p>
                <div className="sample-wave">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="sample-bottom">
                <Bell size={17} />
                {t("waitingLabel")}
              </div>
            </div>
            <div className="ready-bubble">
              <span>
                <Check size={21} />
              </span>
              <div>
                <strong>{t("readyLabel")}</strong>
                <small>{t("readyText")}</small>
              </div>
            </div>
            <span className="art-caption">{t("preview")}</span>
          </div>
        </section>
        <section className="how">
          <div className="section-heading">
            <h2>{t("how")}</h2>
            <span>{t("noApp")}</span>
          </div>
          <div className="steps">
            {(
              [
                ["step1", "desc1", TicketIcon],
                ["step2", "desc2", ScanLine],
                ["step3", "desc3", Bell],
              ] as const
            ).map(([title, desc, Icon], i) => (
              <article key={title}>
                <span className="step-number">0{i + 1}</span>
                <Icon size={26} />
                <h3>{t(title)}</h3>
                <p>{t(desc)}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
function Footer() {
  const { t } = useI18n();
  return (
    <footer>
      <span>{t("brand")}</span>
      <span>{t("footer")}</span>
      <span>© {new Date().getFullYear()}</span>
    </footer>
  );
}
function ErrorBox({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="error" role="alert">
      {message}
      <button onClick={() => location.reload()}>{t("retry")}</button>
    </div>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label={t("close")} onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Branding({
  business,
  onSave,
  close,
}: {
  business: Business;
  onSave: (b: Business) => void;
  close: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(business);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("invalidName"));
      return;
    }
    if ([form.logo_url, form.google_review_url].some((v) => v && !safeUrl(v))) {
      setError(t("invalidUrl"));
      return;
    }
    setBusy(true);
    try {
      const { business: data } = await api("branding", {
        ...form,
        token: sessionStorage.getItem(`pager-${business.slug}`),
      });
      onSave(data);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t("settings")} close={close}>
      <p className="muted">{t("brandingDesc")}</p>
      <form onSubmit={save} className="form">
        {(
          [
            ["name", "businessName"],
            ["name_ar", "arabicName"],
            ["logo_url", "logo"],
            ["google_review_url", "google"],
          ] as const
        ).map(([field, label]) => (
          <label key={field}>
            {t(label)}
            <input
              value={form[field] || ""}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              type={field.includes("url") ? "url" : "text"}
              dir={field === "name_ar" ? "rtl" : undefined}
              required={field === "name"}
            />
          </label>
        ))}
        <label>
          Currency
          <input
            value={form.currency || "USD"}
            maxLength={3}
            pattern="[A-Z]{3}"
            onChange={(e) =>
              setForm({ ...form, currency: e.target.value.toUpperCase() })
            }
          />
        </label>
        <div className="color-fields">
          {(
            [
              ["primary_color", "primary", "#193cba"],
              ["accent_color", "accent", "#ffad66"],
            ] as const
          ).map(([field, label, fallback]) => (
            <label key={field}>
              {t(label)}
              <div>
                <input
                  type="color"
                  value={color(form[field], fallback)}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
                <span>{color(form[field], fallback)}</span>
              </div>
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {t(busy ? "saving" : "save")}
        </button>
      </form>
    </Modal>
  );
}
function Staff() {
  const { slug } = useParams();
  const { t } = useI18n();
  const [business, setBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState(
    () => sessionStorage.getItem(`pager-${slug}`) || "",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Record<string, number | null>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState("");
  const [eta, setEta] = useState(10);
  const [custom, setCustom] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [created, setCreated] = useState<Ticket | null>(null);
  const [branding, setBranding] = useState(false);
  const [edit, setEdit] = useState<Ticket | null>(null);
  const [editEta, setEditEta] = useState(10);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const run = async (action: string, values: Record<string, unknown> = {}) =>
    api(action, { ...values, token });
  async function refresh() {
    try {
      const data = await run("list");
      setTickets(data.tickets);
      setStats(data.stats);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      if (/sign in|expired/.test((e as Error).message)) {
        sessionStorage.removeItem(`pager-${slug}`);
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    setBusiness(null);
    api("business", { slug })
      .then((d) => {
        if (active) setBusiness(d.business);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  useEffect(() => {
    if (!token || !business) return;
    void refresh();
    const timer = setInterval(refresh, 5000);
    const ch = db
      ?.channel(`biz-${business.id}`)
      .on("broadcast", { event: "update" }, () => void refresh())
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      clearInterval(timer);
      if (ch) void db?.removeChannel(ch);
    };
  }, [token, business?.id]);
  async function login(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api("staff_login", { slug, pin });
      sessionStorage.setItem(`pager-${slug}`, d.token);
      setToken(d.token);
      setPin("");
    } catch (e) {
      setError((e as Error).message);
      setPin("");
    } finally {
      setBusy(false);
    }
  }
  function add(name: string, price?: number) {
    setItems((prev) => {
      const old = prev.find((i) => i.name === name && i.price === price);
      return old
        ? prev.map((i) => (i === old ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { name, price, qty: 1 }];
    });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await run("create", {
        items,
        note,
        eta_minutes: eta,
        ...(amount !== "" ? { amount: Number(amount) } : {}),
      });
      setCreated(d.ticket);
      setItems([]);
      setNote("");
      setAmount("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function change(action: string, values: Record<string, unknown>) {
    setBusy(true);
    try {
      await run(action, values);
      await refresh();
      setEdit(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = items.reduce((sum, i) => sum + i.qty * (i.price || 0), 0);
  const url = created ? `${location.origin}/t/${created.id}` : "";
  return (
    <div
      style={
        {
          "--primary": color(business?.primary_color || null, "#193cba"),
          "--accent": color(business?.accent_color || null, "#ffad66"),
        } as React.CSSProperties
      }
    >
      <Header business={business} staff />
      {!token ? (
        <main className="pin-page">
          <div className="pin-card">
            <span className="customer-coffee">
              <Coffee />
            </span>
            <h1>Ready for service?</h1>
            <p>Enter your staff PIN to open the counter.</p>
            {slug === "demo-cafe" && (
              <p className="demo-hint">Demo PIN: 1234</p>
            )}
            <form onSubmit={login}>
              <input
                aria-label="Staff PIN"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                maxLength={12}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <div className="keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "Clear", 0, "⌫"].map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() =>
                      setPin((p) =>
                        k === "Clear"
                          ? ""
                          : k === "⌫"
                            ? p.slice(0, -1)
                            : (p + String(k)).slice(0, 12),
                      )
                    }
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button
                className="button primary full large"
                disabled={busy || pin.length < 4 || !business}
              >
                {busy ? "Signing in…" : "Open counter"}
              </button>
            </form>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </main>
      ) : (
        <main className="pos-main">
          <div className="dashboard-heading">
            <div>
              <div className="live-label">
                <span className={connected ? "connected" : ""} />
                {connected ? "Live service" : "Refreshing every 5 seconds"}
              </div>
              <h1>The counter</h1>
              <p>Good orders. Smooth handoffs.</p>
            </div>
            <div className="toolbar">
              <button
                className="button subtle"
                onClick={() => setBranding(true)}
              >
                <Settings2 size={18} />
                {t("settings")}
              </button>
              <button
                className="button subtle"
                onClick={() => {
                  sessionStorage.removeItem(`pager-${slug}`);
                  setToken("");
                  setTickets([]);
                }}
              >
                Log out
              </button>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <section className="stats pos-stats">
            {[
              ["Completed", stats.completed ?? 0],
              [
                "Avg wait",
                stats.avg_wait == null
                  ? "—"
                  : `${stats.avg_wait.toFixed(1)} min`,
              ],
              [
                "Longest wait",
                stats.longest_wait == null
                  ? "—"
                  : `${stats.longest_wait.toFixed(0)} min`,
              ],
              ["Avg rating", stats.avg_rating?.toFixed(1) ?? "—"],
              [
                "On time",
                stats.on_time == null ? "—" : `${stats.on_time.toFixed(0)}%`,
              ],
            ].map(([label, value]) => (
              <div className="stat" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </section>
          <div className="pos-layout">
            <section className="order-entry">
              <div className="entry-heading">
                <h2>New order</h2>
                <Coffee size={23} />
              </div>
              <form className="form" onSubmit={create}>
                {slug === "demo-cafe" && (
                  <div className="menu-tiles">
                    {[
                      ["Latte", 4],
                      ["Cappuccino", 4],
                      ["Iced Spanish Latte", 5.5],
                      ["Croissant", 3.5],
                      ["Cheesecake", 6],
                      ["Water", 1.5],
                    ].map(([name, p]) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => add(String(name), Number(p))}
                      >
                        <span>{name}</span>
                        <small>{money(Number(p), business?.currency)}</small>
                        <Plus size={16} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="custom-item">
                  <input
                    aria-label="Custom item"
                    placeholder="Custom item"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <input
                    aria-label="Item price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button subtle"
                    disabled={!custom.trim()}
                    onClick={() => {
                      add(custom.trim(), price ? Number(price) : undefined);
                      setCustom("");
                      setPrice("");
                    }}
                    aria-label="Add custom item"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="basket">
                  {!items.length && (
                    <p className="muted">Tap an item to build the order.</p>
                  )}
                  {items.map((i, index) => (
                    <div className="basket-row" key={index}>
                      <div>
                        <strong>{i.name}</strong>
                        <small>{money(i.price || 0, business?.currency)}</small>
                      </div>
                      <div className="stepper">
                        <button
                          type="button"
                          aria-label={`Remove one ${i.name}`}
                          onClick={() =>
                            setItems((p) =>
                              p
                                .map((x, n) =>
                                  n === index ? { ...x, qty: x.qty - 1 } : x,
                                )
                                .filter((x) => x.qty > 0),
                            )
                          }
                        >
                          −
                        </button>
                        <span>{i.qty}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${i.name}`}
                          onClick={() =>
                            setItems((p) =>
                              p.map((x, n) =>
                                n === index ? { ...x, qty: x.qty + 1 } : x,
                              ),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <span>Total</span>
                  <strong>
                    {money(
                      amount !== "" ? Number(amount) : total,
                      business?.currency,
                    )}
                  </strong>
                </div>
                <label>
                  Custom total (optional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Use item total"
                  />
                </label>
                <label>
                  Order note
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Oat milk, takeaway…"
                    rows={2}
                  />
                </label>
                <label>Ready in</label>
                <div className="eta-chips">
                  {[5, 10, 15, 20].map((m) => (
                    <button
                      className={eta === m ? "selected" : ""}
                      type="button"
                      key={m}
                      onClick={() => setEta(m)}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <label>
                  Custom minutes
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={eta}
                    onChange={(e) => setEta(Number(e.target.value))}
                  />
                </label>
                <button
                  className="button primary large full"
                  disabled={busy || (!items.length && !amount) || eta < 1}
                >
                  <Plus size={20} />
                  {busy ? "Working…" : "Create order"}
                </button>
              </form>
            </section>
            <section className="live-queue">
              <div className="entry-heading">
                <h2>Live queue</h2>
                <span className="muted">Today</span>
              </div>
              {loading ? (
                <p className="loading">Loading orders…</p>
              ) : (
                <div className="queue-board">
                  {(["waiting", "ready", "done"] as const).map((status) => (
                    <section className={`queue-column ${status}`} key={status}>
                      <div className="column-heading">
                        <h2>
                          <span className="column-dot" />
                          {status === "waiting"
                            ? "Preparing"
                            : status === "ready"
                              ? "Ready"
                              : "Done"}
                          <span className="count">
                            {tickets.filter((x) => x.status === status).length}
                          </span>
                        </h2>
                      </div>
                      <div className="column-body">
                        {!tickets.some((x) => x.status === status) && (
                          <div className="empty">
                            <Coffee />
                            <p>
                              {status === "waiting"
                                ? "Ready for the next order."
                                : status === "ready"
                                  ? "All caught up."
                                  : "Picked-up orders appear here."}
                            </p>
                          </div>
                        )}
                        {tickets
                          .filter((x) => x.status === status)
                          .map((ticket) => (
                            <article className="pos-ticket" key={ticket.id}>
                              <div className="pos-ticket-top">
                                <strong>#{num(ticket.number)}</strong>
                                {status === "waiting" ? (
                                  <Countdown ticket={ticket} />
                                ) : (
                                  <span>
                                    {time(
                                      status === "ready"
                                        ? ticket.called_at
                                        : ticket.completed_at,
                                    )}
                                  </span>
                                )}
                              </div>
                              <p>
                                {ticket.items
                                  ?.map((i) => `${i.qty} × ${i.name}`)
                                  .join(", ") || "Custom order"}
                              </p>
                              {ticket.note && (
                                <p className="ticket-note">{ticket.note}</p>
                              )}
                              {status !== "done" && (
                                <>
                                  <div className="ticket-actions">
                                    {status === "waiting" ? (
                                      <>
                                        <button
                                          disabled={busy}
                                          className="button subtle"
                                          onClick={() =>
                                            change("update_eta", {
                                              ticket_id: ticket.id,
                                              eta_minutes:
                                                Math.max(
                                                  0,
                                                  Math.ceil(
                                                    (Date.parse(
                                                      ticket.eta_at || "",
                                                    ) -
                                                      Date.now()) /
                                                      60000,
                                                  ) || 0,
                                                ) + 5,
                                            })
                                          }
                                        >
                                          +5 min
                                        </button>
                                        <button
                                          disabled={busy}
                                          className="button subtle"
                                          onClick={() => {
                                            setEdit(ticket);
                                            setEditEta(10);
                                          }}
                                        >
                                          Edit ETA
                                        </button>
                                        <button
                                          disabled={busy}
                                          className="button primary full"
                                          onClick={() =>
                                            change("set_status", {
                                              ticket_id: ticket.id,
                                              status: "ready",
                                            })
                                          }
                                        >
                                          Ready / Call
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          disabled={busy}
                                          className="button subtle"
                                          onClick={() =>
                                            change("set_status", {
                                              ticket_id: ticket.id,
                                              status: "recall",
                                            })
                                          }
                                        >
                                          Re-call
                                        </button>
                                        <button
                                          disabled={busy}
                                          className="button primary"
                                          onClick={() =>
                                            change("set_status", {
                                              ticket_id: ticket.id,
                                              status: "done",
                                            })
                                          }
                                        >
                                          Picked up
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div className="ticket-actions">
                                    <button
                                      disabled={busy}
                                      className="text-button"
                                      onClick={() =>
                                        change("set_status", {
                                          ticket_id: ticket.id,
                                          status: "cancelled",
                                        })
                                      }
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      disabled={busy}
                                      className="text-button"
                                      onClick={() =>
                                        change("push_test", {
                                          ticket_id: ticket.id,
                                        })
                                      }
                                    >
                                      Test alert
                                    </button>
                                  </div>
                                </>
                              )}
                            </article>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      )}
      {branding && business && (
        <Branding
          business={business}
          onSave={setBusiness}
          close={() => setBranding(false)}
        />
      )}
      {edit && (
        <Modal
          title={`Update ETA · #${num(edit.number)}`}
          close={() => setEdit(null)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void change("update_eta", {
                ticket_id: edit.id,
                eta_minutes: editEta,
              });
            }}
          >
            <label>
              Minutes from now
              <input
                type="number"
                min="1"
                max="1440"
                value={editEta}
                onChange={(e) => setEditEta(Number(e.target.value))}
              />
            </label>
            <button disabled={busy} className="button primary">
              Update pickup time
            </button>
          </form>
        </Modal>
      )}
      {created && (
        <Modal
          title={`Order #${num(created.number)}`}
          close={() => setCreated(null)}
        >
          <p className="muted">Scan to track your order</p>
          <div className="qr-panel">
            <QRCodeSVG value={url} size={260} marginSize={3} />
          </div>
          <a
            className="button primary full"
            target="_blank"
            rel="noreferrer"
            href={url}
          >
            Open customer ticket <ArrowUpRight size={18} />
          </a>
          <input
            className="share-url"
            aria-label="Customer ticket link"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
          <button
            className="button subtle full"
            onClick={() => setCreated(null)}
          >
            Next order
          </button>
        </Modal>
      )}
    </div>
  );
}
function Customer() {
  const { ticketId } = useParams();
  const { t, lang } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [partial, setPartial] = useState(false);
  const [vapid, setVapid] = useState<string | null>(null);
  const [wallets, setWallets] = useState<{ label: string; url: string }[]>([]);
  const [install, setInstall] = useState<
    (Event & { prompt: () => Promise<void> }) | null
  >(null);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  useEffect(() => {
    let active = true;
    setWallets([]);
    Promise.allSettled(
      ["google_wallet", "apple_wallet"].map(async (action) => {
        const d = await api(action, { ticket_id: ticketId });
        return d.available && d.url
          ? {
              label:
                action === "google_wallet"
                  ? "Add to Google Wallet"
                  : "Add to Apple Wallet",
              url: d.url,
            }
          : null;
      }),
    ).then((rows) => {
      if (active)
        setWallets(
          rows.flatMap((r) =>
            r.status === "fulfilled" && r.value ? [r.value] : [],
          ),
        );
    });
    return () => {
      active = false;
    };
  }, [ticketId]);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const enabledRef = useRef(false);
  const seen = useRef("");
  const latest = useRef<Ticket | null>(null);
  const strings = useRef(t);
  strings.current = t;
  function beep() {
    const ctx = audio.current;
    if (!ctx) return;
    void ctx.resume();
    [0, 0.22, 0.44].forEach((delay, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = [659, 830, 988][i];
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.28,
      );
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.3);
    });
  }
  function stop() {
    if (loop.current) clearInterval(loop.current);
    loop.current = null;
    setRinging(false);
    navigator.vibrate?.(0);
    document.title = "Qudra Pager";
  }
  async function alertCustomer(current: Ticket) {
    setRinging(true);
    document.title = `${strings.current("notificationTitle")} #${current.number}`;
    beep();
    navigator.vibrate?.([400, 200, 400, 200, 800]);
    if (loop.current) clearInterval(loop.current);
    loop.current = setInterval(() => {
      beep();
      navigator.vibrate?.([400, 200, 400]);
    }, 3500);
  }

  async function acquireWake() {
    try {
      if ("wakeLock" in navigator) {
        if (!wake.current || wake.current.released)
          wake.current = await navigator.wakeLock.request("screen");
      } else setPartial(true);
    } catch {
      setPartial(true);
    }
  }
  async function enable() {
    const permissionRequest =
      "Notification" in window ? Notification.requestPermission() : null;
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtor) {
        audio.current ??= new AudioCtor();
        await audio.current.resume();
        beep();
      } else setPartial(true);
      enabledRef.current = true;

      await acquireWake();
      if ("Notification" in window) {
        const permission = await permissionRequest;
        if (permission !== "granted")
          throw new Error(
            "Allow notifications in your browser settings, then try again.",
          );
        if (!vapid || !("PushManager" in window))
          throw new Error(
            "Lock-screen alerts are not available yet. Keep this page open for updates.",
          );
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        const raw = atob(vapid.replace(/-/g, "+").replace(/_/g, "/"));
        const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const subscription =
          (await reg.pushManager.getSubscription()) ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          }));
        await api("subscribe", {
          ticket_id: ticketId,
          subscription: subscription.toJSON(),
        });
        setEnabled(true);
      } else setPartial(true);
      if (latest.current?.status === "ready")
        void alertCustomer(latest.current);
    } catch (e) {
      setPartial(true);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!db) {
      setError(strings.current("missingConfig"));
      setLoading(false);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const {
          ticket: data,
          business: biz,
          vapid_public,
        } = await api("ticket", { ticket_id: ticketId });
        if (!active) return;
        setError("");
        setTicket(data);
        setBusiness(biz);
        setVapid(vapid_public);
        latest.current = data;
        if (data.rating) {
          setRating(data.rating);
          setRatingSaved(true);
        }
        if (data.status === "ready") {
          const key = `${data.id}-${data.called_at}`;
          if (seen.current !== key) {
            seen.current = key;
            if (enabledRef.current) void alertCustomer(data);
          }
        } else stop();
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };
    const channel = db
      .channel(`ticket-${ticketId}`)
      .on("broadcast", { event: "update" }, refresh)
      .subscribe();
    void refresh();
    const timer = setInterval(refresh, 5000);
    const visible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        if (enabledRef.current) void acquireWake();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      void db!.removeChannel(channel);
      document.removeEventListener("visibilitychange", visible);
      stop();
      void wake.current?.release();
      void audio.current?.close();
    };
  }, [ticketId]);
  async function rate(value: number) {
    if (!ticket || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("rate", { ticket_id: ticket.id, rating: value });
      setRating(value);
      setRatingSaved(true);
      setSaved(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setBusy(true);
    try {
      await api("rate", {
        ticket_id: ticketId,
        rating,
        feedback: feedback.trim(),
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const status = ticket?.status || "waiting";
  return (
    <div
      className={`customer-page ${ringing ? "is-ringing" : ""}`}
      style={
        {
          "--primary": color(business?.primary_color || null, "#193cba"),
          "--accent": color(business?.accent_color || null, "#ffad66"),
        } as React.CSSProperties
      }
    >
      <Header business={business} staff />
      <main className="customer-main">
        {error && <ErrorBox message={error} />}{" "}
        {loading ? (
          <p className="loading">{t("loading")}</p>
        ) : (
          ticket &&
          business && (
            <>
              <div className="customer-intro">
                <span className="customer-coffee">
                  {status === "ready" ? (
                    <Bell size={27} />
                  ) : status === "done" ? (
                    <CheckCheck size={27} />
                  ) : (
                    <Coffee size={27} />
                  )}
                </span>
                <h1>
                  {t(
                    status === "ready"
                      ? "readyLabel"
                      : status === "done"
                        ? "doneLabel"
                        : status === "cancelled"
                          ? "cancelledLabel"
                          : "waitingLabel",
                  )}
                </h1>
                <p>
                  {t(
                    status === "ready"
                      ? "readyText"
                      : status === "done"
                        ? "doneText"
                        : status === "cancelled"
                          ? "cancelledText"
                          : "sitBack",
                  )}
                </p>
              </div>
              <section className={`customer-ticket ${status}`}>
                <div className="ticket-business">
                  {lang === "ar" && business.name_ar
                    ? business.name_ar
                    : business.name}
                  <span>{t("yourTicket")}</span>
                </div>
                <div className="ticket-perf" />
                <div className="customer-number">
                  {String(ticket.number).padStart(3, "0")}
                </div>
                <span className={`status-pill ${status}`}>
                  <span />
                  {t(status === "done" ? "pickup" : status)}
                </span>
                {ticket.note && <p className="customer-note">{ticket.note}</p>}
                <div className="ticket-bottom">
                  <Clock size={15} />
                  {new Intl.DateTimeFormat(lang, {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(ticket.created_at))}
                </div>
              </section>
              {ticket.eta_at && status === "waiting" && (
                <section className="eta-panel">
                  <Countdown ticket={ticket} ring />
                  <h2>Ready at ~{time(ticket.eta_at)}</h2>
                  {ticket.eta_updated_at && (
                    <p className="eta-update" role="status">
                      Updated: now ready at ~{time(ticket.eta_at)}
                    </p>
                  )}
                </section>
              )}
              <section className="order-details">
                <h2>Your order</h2>
                {ticket.items?.map((item, i) => (
                  <div key={i}>
                    <span>
                      {item.qty} × {item.name}
                    </span>
                    <span>
                      {item.price != null
                        ? money(item.qty * item.price, business.currency)
                        : ""}
                    </span>
                  </div>
                ))}
                {ticket.amount != null && (
                  <div className="order-total">
                    <strong>Total</strong>
                    <strong>{money(ticket.amount, business.currency)}</strong>
                  </div>
                )}
              </section>
              <ol className="status-timeline">
                {[
                  ["Order received", ticket.created_at, true],
                  ["Preparing", ticket.created_at, true],
                  ["Ready for pickup", ticket.called_at, !!ticket.called_at],
                  ["Picked up", ticket.completed_at, !!ticket.completed_at],
                ].map(([label, stamp, complete]) => (
                  <li
                    className={complete ? "complete" : ""}
                    key={String(label)}
                  >
                    <span>
                      {complete ? <Check size={15} /> : <Clock size={15} />}
                    </span>
                    <strong>{String(label)}</strong>
                    <time>{stamp ? time(String(stamp)) : "—"}</time>
                  </li>
                ))}
              </ol>
              {wallets.map((w) => (
                <a
                  className="button subtle full wallet-button"
                  key={w.label}
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {w.label}
                </a>
              ))}
              {(status === "waiting" || status === "ready") && (
                <section className="alerts">
                  {ringing ? (
                    <button
                      className="button primary large full"
                      onClick={stop}
                    >
                      <Volume2 size={20} />
                      {t("stop")}
                    </button>
                  ) : (
                    <button
                      className={`button ${enabled ? "subtle" : "primary"} large full`}
                      onClick={enable}
                      disabled={enabled}
                    >
                      <Bell size={20} />
                      {enabled
                        ? "Lock-screen alerts on"
                        : "Turn on lock-screen alerts"}
                      {enabled && <Check size={18} />}
                    </button>
                  )}
                  {ios && !standalone ? (
                    <div className="install-guide">
                      <strong>Install for iPhone alerts</strong>
                      <p>
                        On iOS 16.4 or later, tap Share → Add to Home Screen.
                        Open your order from the Home Screen, then turn on
                        alerts.
                      </p>
                    </div>
                  ) : (
                    <p>
                      Get a notification when your pickup time changes or your
                      order is ready.
                    </p>
                  )}
                  {install && (
                    <button
                      className="button subtle full"
                      onClick={async () => {
                        await install.prompt();
                        setInstall(null);
                      }}
                    >
                      Install Qudra Pager
                    </button>
                  )}
                  {partial && <p role="status">{t("alertPartial")}</p>}
                </section>
              )}
              {status === "done" && (
                <section className="rating-panel">
                  <h2>{t("rate")}</h2>
                  <div className="stars" role="group" aria-label={t("rate")}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        disabled={busy}
                        aria-label={`${n} / 5`}
                        aria-pressed={rating === n}
                        onClick={() => rate(n)}
                      >
                        <Star
                          size={35}
                          fill={n <= rating ? "#ef9b35" : "none"}
                          color={n <= rating ? "#b76a0c" : "#a1a9be"}
                        />
                      </button>
                    ))}
                  </div>
                  {ratingSaved && (
                    <p className="saved" role="status">
                      {t("saved")}
                    </p>
                  )}
                  {rating >= 4 && safeUrl(business.google_review_url) && (
                    <a
                      className="button primary full"
                      href={safeUrl(business.google_review_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("review")}
                      <ArrowUpRight size={19} />
                    </a>
                  )}
                  {rating > 0 &&
                    rating <= 3 &&
                    (saved ? (
                      <p role="status">{t("thanks")}</p>
                    ) : (
                      <form className="form" onSubmit={send}>
                        <label>
                          {t("feedback")}
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={t("feedbackPlaceholder")}
                            rows={4}
                            required
                          />
                        </label>
                        <button
                          className="button primary full"
                          disabled={busy || !feedback.trim()}
                        >
                          {t(busy ? "saving" : "sendFeedback")}
                        </button>
                      </form>
                    ))}
                </section>
              )}
              <p className="privacy">
                <TicketIcon size={15} />
                {t("privacy")}
              </p>
            </>
          )
        )}
      </main>
    </div>
  );
}
function Missing() {
  const { t } = useI18n();
  return (
    <>
      <Header />
      <main className="missing">
        <h1>{t("notFound")}</h1>
        <Link className="button primary" to="/">
          {t("back")}
        </Link>
      </main>
    </>
  );
}
function StaffRoute() {
  const { slug } = useParams();
  return <Staff key={slug} />;
}
function CustomerRoute() {
  const { ticketId } = useParams();
  return <Customer key={ticketId} />;
}
function App() {
  const [lang, setLang] = useState(() => {
    try {
      return (
        localStorage.getItem("qudra-language") ||
        (navigator.language.startsWith("ar") ? "ar" : "en")
      );
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("qudra-language", lang);
    } catch {}
  }, [lang]);
  return (
    <Locale.Provider
      value={{
        lang,
        t: (k) => (lang === "ar" ? ar : en)[k],
        toggle: () => setLang((x) => (x === "ar" ? "en" : "ar")),
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/b/:slug/staff" element={<StaffRoute />} />
          <Route path="/t/:ticketId" element={<CustomerRoute />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </BrowserRouter>
    </Locale.Provider>
  );
}
if ("serviceWorker" in navigator)
  void navigator.serviceWorker.register("/sw.js").catch(() => {});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
