# Portfolio Grouping Programme Plan
- start: 2026-Q1
- end: 2028-Q4
- timeslice: quarter

Programme-level sequencing grouped by delivery stream. The Gantt uses short stage
titles and explicit cross-stream arrows to show the main handoffs between workstreams.

## Lanes

### TBS
- color: "#e8eefc"

Trading Book Service stream. Covers the core grouping model, APIs, and UI foundation.

### Quartz
- color: "#ece8fc"

Quartz4 rebuild stream. Event-driven PB services and new reconciliation engine.

### Cash
- color: "#eaf7ef"

Cash framework and subportfolio support.

### PnL App
- color: "#fcefdc"

PnL application engine and UI integration.

### Infra
- color: "#fce8e8"

Infrastructure and platform enablement.

## Stages

### Trading Book Service + UI
- id: tbs-1
- lane: TBS
- start: 2026-Q2
- end: 2026-Q2
- enables: tbs-2

Deliver the Trading Book Service core grouping model and APIs.
Deliver the minimum UI for navigation and self-service grouping changes.

### Reader Client + MatFac
- id: tbs-2
- lane: TBS
- start: 2026-Q3
- end: 2026-Q3
- depends_on: tbs-1
- enables: tbs-3

Publish the reusable Trading Book Service reader client.
Make MatadorFacade group-aware for trade and position resolution.

### Trade + Position Readers
- id: tbs-3
- lane: TBS
- start: 2026-Q4
- end: 2026-Q4
- depends_on: tbs-2
- enables: pnl-2, quartz-3

Make readers and clients resolve group IDs and names down to leaf tuples.

### Event Driven PB Services
- id: quartz-1
- lane: Quartz
- start: 2027-Q1
- end: 2027-Q1
- enables: quartz-2

Stand up the event-driven PB service foundation and service boundaries.

### Migrate All PB Services
- id: quartz-2
- lane: Quartz
- start: 2027-Q2
- end: 2027-Q2
- depends_on: quartz-1
- enables: quartz-3

Complete migration of all PB service work.

### Rec Engine Pos + Trade
- id: quartz-3
- lane: Quartz
- start: 2027-Q3
- end: 2027-Q3
- depends_on: quartz-2, tbs-3
- enables: quartz-4

Deliver the new reconciliation engine for positions and trades.

### Rec Engine Full
- id: quartz-4
- lane: Quartz
- start: 2027-Q4
- end: 2028-Q1
- depends_on: quartz-3

Extend reconciliation to cover full instrument scope.

### Cash Framework
- id: cash-1
- lane: Cash
- start: 2026-Q3
- end: 2026-Q3
- enables: cash-2

Establish the cash framework changes needed for subportfolio-aware cash processing.

### Cash Subportfolio
- id: cash-2
- lane: Cash
- start: 2026-Q4
- end: 2026-Q4
- depends_on: cash-1
- enables: cash-3

Add subportfolio-level cash support in the new framework.

### Cash Reporting
- id: cash-3
- lane: Cash
- start: 2027-Q2
- end: 2027-Q3
- depends_on: cash-2

Deliver cash reporting across subportfolio hierarchy.

### Pricing Config Service
- id: pnl-1
- lane: PnL App
- start: 2026-Q4
- end: 2026-Q4
- enables: pnl-2

Create the new application pricing setup service.

### PnL App Engine
- id: pnl-2
- lane: PnL App
- start: 2027-Q1
- end: 2027-Q2
- depends_on: pnl-1, tbs-3

Build the new PnL engine on top of the Trading Book Service.

### PnL UI Integration
- id: pnl-3
- lane: PnL App
- start: 2027-Q3
- end: 2027-Q4
- depends_on: pnl-2

Integrate PnL engine into the front-office UI.

### Cloud Migration
- id: infra-1
- lane: Infra
- start: 2026-Q1
- end: 2026-Q2

Migrate shared services to cloud-native infrastructure.

### Observability Platform
- id: infra-2
- lane: Infra
- start: 2027-Q1
- end: 2027-Q2
- depends_on: infra-1
- enables: infra-3

Roll out centralised metrics, tracing, and alerting.

### DR & Hardening
- id: infra-3
- lane: Infra
- start: 2028-Q1
- end: 2028-Q2
- depends_on: infra-2

Disaster-recovery runbooks and production hardening across all streams.
