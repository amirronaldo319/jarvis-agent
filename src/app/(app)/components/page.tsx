"use client";
import { useState } from "react";
import { Badge, Button, Field, Panel, RadarChart, Readout, RingGauge, SegmentBar, Tabs, Terminal, type TermLine } from "@/components/hud";

const SAMPLE_LOG: TermLine[] = [
  { time: "00:00:01", level: "info", message: "Reactor online" },
  { time: "00:00:03", level: "ok", message: "Coolant loop A nominal" },
  { time: "00:00:07", level: "warn", message: "Coolant loop B pressure rising" },
  { time: "00:00:09", level: "error", message: "Flight stabiliser offline" },
];
const AXES = [
  { label: "Power", value: 82 }, { label: "Shield", value: 64 }, { label: "Thrust", value: 91 },
  { label: "Sensors", value: 55 }, { label: "Comms", value: 73 },
];
const TABS = [{ id: "sys", label: "Systems" }, { id: "nav", label: "Navigation" }, { id: "wpn", label: "Armament" }] as const;

function Showcase() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("sys");
  const [name, setName] = useState("");
  return (
    <div className="grid">
      <Panel title="Panel" code="SYS-01"><p style={{ margin: 0 }}>Flat plate, hairline border, corner brackets that carry the tone.</p></Panel>
      <Panel title="Panel · warn" code="SYS-02" tone="warn"><p style={{ margin: 0 }}>Use when the whole subsystem is cautionary.</p></Panel>
      <Panel title="Panel · critical" code="SYS-03" tone="critical"><p style={{ margin: 0 }}>Use when the whole subsystem is critical.</p></Panel>
      <Panel title="Button">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button>Engage</Button><Button variant="primary">Run diagnostic</Button><Button variant="danger">Abort</Button><Button disabled>Offline</Button>
        </div>
      </Panel>
      <Panel title="Readout"><Readout label="Reactor output" value="3.2" unit="GJ/s" delta="+0.4 vs. last hour" /></Panel>
      <Panel title="Badge">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Badge status="nominal" /><Badge status="caution" /><Badge status="critical" /><Badge status="offline" /></div>
      </Panel>
      <Panel title="RingGauge">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <RingGauge value={72} label="Power" size={104} /><RingGauge value={45} label="Coolant" tone="warn" size={104} /><RingGauge value={18} label="Fuel" tone="critical" size={104} />
        </div>
      </Panel>
      <Panel title="SegmentBar">
        <div style={{ display: "grid", gap: 16 }}>
          <SegmentBar value={70} label="Shield" /><SegmentBar value={40} label="Coolant" tone="warn" /><SegmentBar value={15} label="Fuel" tone="critical" />
        </div>
      </Panel>
      <Panel title="Field">
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Callsign" placeholder="Enter callsign" value={name} onChange={(e) => setName(e.target.value)} hint="Up to 12 characters" />
          <Field label="Access code" defaultValue="0000" error="ACCESS DENIED" />
        </div>
      </Panel>
      <Panel title="Tabs"><Tabs tabs={[...TABS]} value={tab} onChange={setTab} label="Subsystems"><p style={{ margin: 0 }}>{TABS.find((t) => t.id === tab)?.label} panel. Arrow keys, Home and End move between tabs.</p></Tabs></Panel>
      <Panel title="Terminal"><Terminal lines={SAMPLE_LOG} prompt="run diagnostic" /></Panel>
      <Panel title="RadarChart"><div style={{ display: "grid", placeItems: "center" }}><RadarChart axes={AXES} max={100} label="Systems" /></div></Panel>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <div className="page"><div className="page__inner">
      <h2 className="page-title">Components</h2>
      <p className="muted" style={{ margin: 0 }}>All ten reference components with sample values (not live data). The first set follows your active theme; the second is pinned to Alert Amber.</p>
      <Showcase />
      <div className="themebox" data-theme="alert">
        <h3 className="panel__title" style={{ margin: "0 0 16px", color: "var(--signal)" }}>Alert Amber</h3>
        <Showcase />
      </div>
    </div></div>
  );
}
