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
  Copy,
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
  name_ar: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  google_review_url: string | null;
};
type Ticket = {
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
    const { data, error } = await db!
      .from("pager_businesses")
      .update({
        name: form.name.trim(),
        name_ar: form.name_ar,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        google_review_url: form.google_review_url,
      })
      .eq("id", business.id)
      .select()
      .single();
    setBusy(false);
    if (error) setError(t("error"));
    else {
      onSave(data);
      close();
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
  const { t, lang } = useI18n();
  const [business, setBusiness] = useState<Business | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [modal, setModal] = useState<"new" | "branding" | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!db) {
      setError(t("missingConfig"));
      setLoading(false);
      return;
    }
    let active = true;
    let cleanup = () => {};
    async function init() {
      const { data, error } = await db!
        .from("pager_businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setError(t(error ? "error" : "notFound"));
        setLoading(false);
        return;
      }
      setBusiness(data);
      const refresh = async () => {
        const { data: rows, error } = await db!
          .from("pager_tickets")
          .select("*")
          .eq("business_id", data.id)
          .order("created_at", { ascending: false });
        if (active) {
          if (error) setError(t("error"));
          else {
            setTickets(rows || []);
            setError("");
          }
          setLoading(false);
        }
      };
      const channel = db!
        .channel(`staff-${data.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pager_tickets",
            filter: `business_id=eq.${data.id}`,
          },
          refresh,
        )
        .subscribe((status) => {
          if (active) setConnected(status === "SUBSCRIBED");
        });
      const timer = setInterval(refresh, 10000);
      cleanup = () => {
        clearInterval(timer);
        void db!.removeChannel(channel);
      };
      await refresh();
    }
    void init();
    const timer = setInterval(() => tick((n) => n + 1), 30000);
    return () => {
      active = false;
      clearInterval(timer);
      cleanup();
    };
  }, [slug]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!business || busy) return;
    setBusy(true);
    setError("");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data: highest, error: readError } = await db!
      .from("pager_tickets")
      .select("number")
      .eq("business_id", business.id)
      .gte("created_at", start.toISOString())
      .order("number", { ascending: false })
      .limit(1);
    if (readError) {
      setError(t("error"));
      setBusy(false);
      return;
    }
    const { data, error } = await db!
      .from("pager_tickets")
      .insert({
        business_id: business.id,
        number: (highest?.[0]?.number || 0) + 1,
        note: note.trim() || null,
        status: "waiting",
      })
      .select()
      .single();
    setBusy(false);
    if (error) setError(t("error"));
    else {
      setTickets((prev) => [data, ...prev.filter((x) => x.id !== data.id)]);
      setCreated(data);
      setModal(null);
      setNote("");
      setCopied(false);
    }
  }
  async function update(ticket: Ticket, status: Ticket["status"]) {
    setPending(ticket.id);
    const values: Record<string, string> = { status };
    if (status === "ready") values.called_at = new Date().toISOString();
    if (status === "done") values.completed_at = new Date().toISOString();
    const { data, error } = await db!
      .from("pager_tickets")
      .update(values)
      .eq("id", ticket.id)
      .select()
      .single();
    setPending(null);
    if (error) setError(t("error"));
    else setTickets((prev) => prev.map((x) => (x.id === data.id ? data : x)));
  }
  const today = new Date().toDateString();
  const todays = tickets.filter(
    (x) => new Date(x.created_at).toDateString() === today,
  );
  const complete = tickets.filter(
    (x) =>
      x.status === "done" &&
      x.completed_at &&
      new Date(x.completed_at).toDateString() === today,
  );
  const waits = todays
    .filter((x) => x.called_at)
    .map((x) =>
      Math.max(0, (+new Date(x.called_at!) - +new Date(x.created_at)) / 60000),
    );
  const ratings = complete.filter((x) => x.rating);
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
      <main className="staff-main">
        <div className="dashboard-heading">
          <div>
            <div className="live-label">
              <span className={connected ? "connected" : ""} />
              {t(connected ? "live" : "connecting")}
              <span className="date">
                {new Intl.DateTimeFormat(lang, {
                  month: "short",
                  day: "numeric",
                }).format(new Date())}
              </span>
            </div>
            <h1>{t("queue")}</h1>
            <p>{t("queueDesc")}</p>
          </div>
          <div className="toolbar">
            <button
              className="button subtle"
              disabled={!business}
              onClick={() => setModal("branding")}
            >
              <Settings2 size={18} />
              {t("settings")}
            </button>
            <button
              className="button primary"
              disabled={!business}
              onClick={() => setModal("new")}
            >
              <Plus size={21} />
              {t("newTicket")}
            </button>
          </div>
        </div>
        {error && <ErrorBox message={error} />}
        <section className="stats">
          {[
            [t("completed"), complete.length, CheckCheck],
            [
              t("avgWait"),
              `${waits.length ? (waits.reduce((a, b) => a + b, 0) / waits.length).toFixed(1) : "—"} ${t("minutes")}`,
              Clock,
            ],
            [
              t("peakWait"),
              `${waits.length ? Math.max(...waits).toFixed(1) : "—"} ${t("minutes")}`,
              Volume2,
            ],
            [
              t("avgRating"),
              ratings.length
                ? (
                    ratings.reduce((a, b) => a + b.rating!, 0) / ratings.length
                  ).toFixed(1)
                : "—",
              Star,
            ],
          ].map(([label, value, Icon]) => {
            const I = Icon as typeof Star;
            return (
              <div className="stat" key={String(label)}>
                <div>
                  <span>{String(label)}</span>
                  <strong>{String(value)}</strong>
                </div>
                <I size={23} />
              </div>
            );
          })}
        </section>
        {loading ? (
          <div className="loading">{t("loading")}</div>
        ) : (
          <section className="queue-board">
            {(["waiting", "ready", "done"] as const).map((status) => {
              const rows =
                status === "done"
                  ? complete
                  : tickets.filter((x) => x.status === status);
              return (
                <section className={`queue-column ${status}`} key={status}>
                  <div className="column-heading">
                    <h2>
                      <span className="column-dot" />
                      {t(status)}
                      <span className="count">{rows.length}</span>
                    </h2>
                    {status === "done" ? (
                      <CircleCheck size={19} />
                    ) : status === "ready" ? (
                      <Bell size={19} />
                    ) : (
                      <Clock size={19} />
                    )}
                  </div>
                  <div className="column-body">
                    {!rows.length && (
                      <div className="empty">
                        <span>
                          {status === "waiting" ? (
                            <TicketIcon />
                          ) : status === "ready" ? (
                            <Coffee />
                          ) : (
                            <CheckCheck />
                          )}
                        </span>
                        <strong>
                          {t(
                            status === "waiting"
                              ? "waitingEmpty"
                              : status === "ready"
                                ? "readyEmpty"
                                : "doneEmpty",
                          )}
                        </strong>
                        <p>
                          {t(
                            status === "waiting"
                              ? "waitingHint"
                              : status === "ready"
                                ? "readyHint"
                                : "doneHint",
                          )}
                        </p>
                      </div>
                    )}
                    {rows.map((ticket) => (
                      <article className="queue-ticket" key={ticket.id}>
                        <div className="card-top">
                          <strong>
                            <span>#</span>
                            {String(ticket.number).padStart(3, "0")}
                          </strong>
                          <span>
                            {Math.floor(
                              (Date.now() - +new Date(ticket.created_at)) /
                                60000,
                            ) || t("justNow")}
                            {Math.floor(
                              (Date.now() - +new Date(ticket.created_at)) /
                                60000,
                            ) > 0
                              ? ` ${t("timeAgo")}`
                              : ""}
                          </span>
                        </div>
                        {ticket.note && (
                          <p className="order-note">{ticket.note}</p>
                        )}
                        {status === "done" ? (
                          <div className="completed-line">
                            <CheckCheck size={16} />
                            {t("pickup")}
                            {ticket.rating && <span>★ {ticket.rating}</span>}
                          </div>
                        ) : (
                          <>
                            <div className="card-actions">
                              <button
                                className={`button ${status === "waiting" ? "primary" : "subtle"}`}
                                disabled={pending === ticket.id}
                                onClick={() => update(ticket, "ready")}
                              >
                                <Bell size={16} />
                                {t(status === "waiting" ? "call" : "recall")}
                              </button>
                              {status === "ready" && (
                                <button
                                  className="button primary"
                                  disabled={pending === ticket.id}
                                  onClick={() => update(ticket, "done")}
                                >
                                  <Check size={16} />
                                  {t("pickup")}
                                </button>
                              )}
                            </div>
                            <div className="card-bottom">
                              <button
                                onClick={() => {
                                  setCreated(ticket);
                                  setCopied(false);
                                }}
                              >
                                {t("openTicket")}
                                <ArrowUpRight size={13} />
                              </button>
                              <button
                                disabled={pending === ticket.id}
                                onClick={() => update(ticket, "cancelled")}
                              >
                                {t("cancel")}
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        )}
      </main>
      <Footer />
      {modal === "branding" && business && (
        <Branding
          business={business}
          onSave={setBusiness}
          close={() => setModal(null)}
        />
      )}{" "}
      {modal === "new" && (
        <Modal title={t("newTicket")} close={() => setModal(null)}>
          <form onSubmit={create} className="form">
            <label>
              {t("note")} <span className="muted">({t("optional")})</span>
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={3}
              />
            </label>
            <button className="button primary large" disabled={busy}>
              <Plus size={20} />
              {t(busy ? "creating" : "create")}
            </button>
          </form>
        </Modal>
      )}
      {created && (
        <Modal title={t("scan")} close={() => setCreated(null)}>
          <p className="muted">{t("scanDesc")}</p>
          <div className="qr-panel">
            <span>
              {t("ticket")} #{String(created.number).padStart(3, "0")}
            </span>
            <QRCodeSVG value={url} size={240} marginSize={2} level="M" />
          </div>
          <a
            className="button primary full"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {t("openTicket")}
            <ArrowUpRight size={18} />
          </a>
          <button
            className="button subtle full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setError(t("error"));
              }
            }}
          >
            <Copy size={17} />
            {t(copied ? "copied" : "copy")}
          </button>
          <input
            className="share-url"
            readOnly
            value={url}
            aria-label={t("openTicket")}
            onFocus={(e) => e.target.select()}
          />
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
    if ("Notification" in window && Notification.permission === "granted") {
      const options = {
        body: `${strings.current("notificationBody")} #${current.number}`,
        icon: "/icon.svg",
        tag: `ticket-${current.id}`,
        renotify: true,
        data: { url: `/t/${current.id}` },
      };
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration)
          await registration.showNotification(
            strings.current("notificationTitle"),
            options,
          );
        else new Notification(strings.current("notificationTitle"), options);
      } catch {
        setPartial(true);
      }
    }
  }
  async function acquireWake() {
    try {
      if ("wakeLock" in navigator)
        wake.current = await navigator.wakeLock.request("screen");
      else setPartial(true);
    } catch {
      setPartial(true);
    }
  }
  async function enable() {
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
      setEnabled(true);
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") setPartial(true);
      } else setPartial(true);
      await acquireWake();
      if (latest.current?.status === "ready")
        void alertCustomer(latest.current);
    } catch {
      setPartial(true);
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
      const { data, error } = await db!
        .from("pager_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setError(strings.current(error ? "error" : "notFound"));
        setLoading(false);
        return;
      }
      setError("");
      setTicket(data);
      latest.current = data;
      setRating(data.rating || 0);
      setRatingSaved(!!data.rating);
      if (data.status === "ready") {
        const key = `${data.id}-${data.called_at}`;
        if (seen.current !== key) {
          seen.current = key;
          if (enabledRef.current) void alertCustomer(data);
        }
      } else stop();
      const { data: biz, error: bizError } = await db!
        .from("pager_businesses")
        .select("*")
        .eq("id", data.business_id)
        .maybeSingle();
      if (active) {
        if (bizError || !biz) setError(strings.current("error"));
        else setBusiness(biz);
        setLoading(false);
      }
    };
    const channel = db
      .channel(`customer-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pager_tickets",
          filter: `id=eq.${ticketId}`,
        },
        refresh,
      )
      .subscribe();
    void refresh();
    const timer = setInterval(refresh, 10000);
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
    const { error } = await db!
      .from("pager_tickets")
      .update({ rating: value })
      .eq("id", ticket.id);
    setBusy(false);
    if (error) setError(t("error"));
    else {
      setRating(value);
      setRatingSaved(true);
      setSaved(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setBusy(true);
    const { error } = await db!
      .from("pager_tickets")
      .update({ feedback: feedback.trim() })
      .eq("id", ticketId);
    setBusy(false);
    if (error) setError(t("error"));
    else setSaved(true);
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
                      {t(enabled ? "enabled" : "enable")}
                      {enabled && <Check size={18} />}
                    </button>
                  )}
                  <p>{t("alertHint")}</p>
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
          <Route path="/b/:slug/staff" element={<Staff />} />
          <Route path="/t/:ticketId" element={<Customer />} />
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
