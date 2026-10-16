/**
 * Every backend path, defined once. Paths are relative to the RTK Query base URL
 * (`/api/v1`, proxied to the Express API by next.config.ts rewrites).
 *
 * Rule: no URL string may appear anywhere else in the app — services import from here.
 */

export const API_BASE_URL = "/api/v1";

const id = (value: string) => encodeURIComponent(value);

export const ENDPOINTS = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    otpRequest: "/auth/otp/request",
    otpVerify: "/auth/otp/verify",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    passwordForgot: "/auth/password/forgot",
    passwordReset: "/auth/password/reset",
    me: "/auth/me",
    mePreferences: "/auth/me/preferences",
    sessions: "/auth/sessions",
    acceptInvitation: (token: string) => `/invitations/${id(token)}/accept`,
  },

  adminAuth: {
    login: "/admin/auth/login",
    refresh: "/admin/auth/refresh",
    logout: "/admin/auth/logout",
    me: "/admin/auth/me",
  },

  attachments: {
    upload: "/attachments",
    byId: (attachmentId: string) => `/attachments/${id(attachmentId)}`,
  },

  company: {
    profile: "/company",
    settings: "/company/settings",
    holidays: "/company/holidays",
    holidayById: (holidayId: string) => `/company/holidays/${id(holidayId)}`,
    auditLogs: "/company/audit-logs",
  },

  users: {
    list: "/users",
    byId: (userId: string) => `/users/${id(userId)}`,
    reactivate: (userId: string) => `/users/${id(userId)}/reactivate`,
    projects: (userId: string) => `/users/${id(userId)}/projects`,
    /** A munshi's one-time sign-in code (when SMS doesn't arrive). */
    loginCode: (userId: string) => `/users/${id(userId)}/login-code`,
    password: (userId: string) => `/users/${id(userId)}/password`,
    /** Effective permissions with the source of each (GET), overrides (PUT), role (PATCH). */
    permissions: (userId: string) => `/users/${id(userId)}/permissions`,
    permissionOverrides: (userId: string) => `/users/${id(userId)}/permission-overrides`,
    role: (userId: string) => `/users/${id(userId)}/role`,
    roles: (userId: string) => `/users/${id(userId)}/roles`,
  },

  permissions: {
    catalog: "/permissions/catalog",
  },

  roles: {
    list: "/roles",
    byId: (roleId: string) => `/roles/${id(roleId)}`,
    duplicate: (roleId: string) => `/roles/${id(roleId)}/duplicate`,
    permissions: (roleId: string) => `/roles/${id(roleId)}/permissions`,
  },

  invitations: {
    list: "/invitations",
    byId: (invitationId: string) => `/invitations/${id(invitationId)}`,
    resend: (invitationId: string) => `/invitations/${id(invitationId)}/resend`,
  },

  devices: {
    list: "/devices",
    byId: (deviceId: string) => `/devices/${id(deviceId)}`,
  },

  sync: {
    /** Phones' sync health: last sync, entries waiting, last refused entries. */
    status: "/sync/status",
  },

  /** Step 17 · Closeout: drawings, snags, handover, retention. */
  closeout: {
    drawings: (projectId: string) => `/projects/${id(projectId)}/drawings`,
    drawingById: (drawingId: string) => `/drawings/${id(drawingId)}`,
    drawingRevisions: (drawingId: string) => `/drawings/${id(drawingId)}/revisions`,
    revisionById: (revisionId: string) => `/drawing-revisions/${id(revisionId)}`,
    snags: (projectId: string) => `/projects/${id(projectId)}/snags`,
    snagById: (snagId: string) => `/snags/${id(snagId)}`,
    snagFix: (snagId: string) => `/snags/${id(snagId)}/fix`,
    snagVerify: (snagId: string) => `/snags/${id(snagId)}/verify`,
    snagReopen: (snagId: string) => `/snags/${id(snagId)}/reopen`,
    snagCost: (snagId: string) => `/snags/${id(snagId)}/cost`,
    handover: (projectId: string) => `/projects/${id(projectId)}/handover`,
    handoverItem: (projectId: string, key: string) => `/projects/${id(projectId)}/handover/items/${id(key)}`,
    handoverSignOff: (projectId: string) => `/projects/${id(projectId)}/handover/sign-off`,
    handoverComplete: (projectId: string) => `/projects/${id(projectId)}/handover/complete`,
    handoverCertificate: (projectId: string) => `/projects/${id(projectId)}/handover/certificate`,
    retention: (projectId: string) => `/projects/${id(projectId)}/retention`,
  },

  /** Step 15 · Change orders + site instructions. */
  changeOrders: {
    list: (projectId: string) => `/projects/${id(projectId)}/change-orders`,
    rates: (projectId: string) => `/projects/${id(projectId)}/change-orders/rates`,
    byId: (coId: string) => `/change-orders/${id(coId)}`,
    action: (coId: string, action: "send" | "approve" | "reject" | "reopen" | "start" | "complete" | "bill") => `/change-orders/${id(coId)}/${action}`,
    pdf: (coId: string) => `/change-orders/${id(coId)}/pdf`,
    instructions: (projectId: string) => `/projects/${id(projectId)}/site-instructions`,
    instructionById: (siId: string) => `/site-instructions/${id(siId)}`,
    convertInstruction: (siId: string) => `/site-instructions/${id(siId)}/convert`,
    dismissInstruction: (siId: string) => `/site-instructions/${id(siId)}/dismiss`,
    fromSnag: (snagId: string) => `/snags/${id(snagId)}/change-order`,
  },

  dailyLogs: {
    list: (projectId: string) => `/projects/${id(projectId)}/daily-logs`,
    byId: (logId: string) => `/daily-logs/${id(logId)}`,
  },

  subscription: {
    current: "/subscription",
    plans: "/subscription/plans",
    payments: "/subscription/payments",
    changePlan: "/subscription/change-plan",
  },

  masterData: {
    materialGroups: "/material-groups",
    materials: "/materials",
    materialById: (materialId: string) => `/materials/${id(materialId)}`,
    materialHide: (materialId: string) => `/materials/${id(materialId)}/hide`,
    materialShow: (materialId: string) => `/materials/${id(materialId)}/show`,

    qualityCategories: "/quality-categories",
    qualityCategoryById: (categoryId: string) => `/quality-categories/${id(categoryId)}`,
    qualityCategoryDuplicate: (categoryId: string) => `/quality-categories/${id(categoryId)}/duplicate`,
    qualityCategoryArchive: (categoryId: string) => `/quality-categories/${id(categoryId)}/archive`,

    priceList: "/price-list",
    priceListBulkPercent: "/price-list/bulk-percent",
    priceListHistory: "/price-list/history",

    laborRates: "/labor-rates",

    workerTypes: "/worker-types",
    workerTypeById: (workerTypeId: string) => `/worker-types/${id(workerTypeId)}`,

    paymentTemplates: "/payment-templates",
    paymentTemplateById: (templateId: string) => `/payment-templates/${id(templateId)}`,

    suppliers: "/suppliers",
    supplierById: (supplierId: string) => `/suppliers/${id(supplierId)}`,
    supplierActivate: (supplierId: string) => `/suppliers/${id(supplierId)}/activate`,
    supplierDeactivate: (supplierId: string) => `/suppliers/${id(supplierId)}/deactivate`,
    supplierRates: (supplierId: string) => `/suppliers/${id(supplierId)}/rates`,

    workers: "/workers",
    workerById: (workerId: string) => `/workers/${id(workerId)}`,
    workerActivate: (workerId: string) => `/workers/${id(workerId)}/activate`,
    workerDeactivate: (workerId: string) => `/workers/${id(workerId)}/deactivate`,

    subcontractors: "/subcontractors",
    subcontractorById: (subcontractorId: string) => `/subcontractors/${id(subcontractorId)}`,
    subcontractorActivate: (subcontractorId: string) => `/subcontractors/${id(subcontractorId)}/activate`,
    subcontractorDeactivate: (subcontractorId: string) => `/subcontractors/${id(subcontractorId)}/deactivate`,
  },

  /** First-login setup checklist (owner). */
  onboarding: {
    checklist: "/onboarding/checklist",
    dismiss: "/onboarding/checklist/dismiss",
    ratesReviewed: "/onboarding/checklist/rates-reviewed",
  },

  /** Excel / CSV import: template → preview → commit (same file again). */
  imports: {
    template: (entity: string) => `/imports/${id(entity)}/template`,
    preview: (entity: string) => `/imports/${id(entity)}/preview`,
    commit: (entity: string) => `/imports/${id(entity)}/commit`,
  },

  /** Opening balances (company.opening.manage), locked once saved. */
  openingBalances: {
    list: "/opening-balances",
  },

  /** "Try with demo data": POST creates, DELETE removes everything tagged DEMO. */
  demo: {
    root: "/demo",
  },

  clients: {
    list: "/clients",
    byId: (clientId: string) => `/clients/${id(clientId)}`,
  },

  // Step 12 · quotes / sales pipeline
  quotes: {
    list: "/quotes",
    assumptions: "/quotes/assumptions",
    preview: "/quotes/preview",
    insights: "/quotes/insights",
    byId: (quoteId: string) => `/quotes/${id(quoteId)}`,
    revisions: (quoteId: string) => `/quotes/${id(quoteId)}/revisions`,
    send: (quoteId: string) => `/quotes/${id(quoteId)}/send`,
    negotiation: (quoteId: string) => `/quotes/${id(quoteId)}/negotiation`,
    lost: (quoteId: string) => `/quotes/${id(quoteId)}/lost`,
    won: (quoteId: string) => `/quotes/${id(quoteId)}/won`,
    pdf: (quoteId: string) => `/quotes/${id(quoteId)}/pdf`,
  },

  projects: {
    list: "/projects",
    byId: (projectId: string) => `/projects/${id(projectId)}`,
    review: (projectId: string) => `/projects/${id(projectId)}/review`,
    activate: (projectId: string) => `/projects/${id(projectId)}/activate`,
    status: (projectId: string) => `/projects/${id(projectId)}/status`,
    basic: (projectId: string) => `/projects/${id(projectId)}/basic`,
    team: (projectId: string) => `/projects/${id(projectId)}/team`,
    contract: (projectId: string) => `/projects/${id(projectId)}/contract`,
    contractFromEstimate: (projectId: string) => `/projects/${id(projectId)}/contract/from-estimate`,
    plotStructure: (projectId: string) => `/projects/${id(projectId)}/plot-structure`,
    coverage: (projectId: string) => `/projects/${id(projectId)}/coverage`,
    floors: (projectId: string) => `/projects/${id(projectId)}/floors`,
    estimate: (projectId: string) => `/projects/${id(projectId)}/estimate`,
    estimateSettings: (projectId: string) => `/projects/${id(projectId)}/estimate/settings`,
    /** Step 11 — saved estimate revisions (BoQ) + owner shopping list. */
    estimates: (projectId: string) => `/projects/${id(projectId)}/estimates`,
    shoppingList: (projectId: string) => `/projects/${id(projectId)}/owner-shopping-list`,
    shoppingListPdf: (projectId: string) => `/projects/${id(projectId)}/owner-shopping-list/pdf`,
    supplyPresets: "/supply-presets",
    floorRooms: (floorId: string) => `/floors/${id(floorId)}/rooms`,
    floorCopy: (floorId: string) => `/floors/${id(floorId)}/copy`,
    floorWallsAuto: (floorId: string) => `/floors/${id(floorId)}/walls/auto`,
    roomWalls: (roomId: string) => `/rooms/${id(roomId)}/walls`,
    roomById: (roomId: string) => `/rooms/${id(roomId)}`,
    roomOpenings: (roomId: string) => `/rooms/${id(roomId)}/openings`,
    openingById: (openingId: string) => `/openings/${id(openingId)}`,
  },

  inventory: {
    locations: "/stock-locations",
    storeStock: (locationId: string) => `/stores/${id(locationId)}/stock`,
    lowStockLevels: (locationId: string) => `/stores/${id(locationId)}/low-stock-levels`,
    movements: "/stock/movements",
    projectStock: (projectId: string) => `/projects/${id(projectId)}/stock`,
    projectUsage: (projectId: string) => `/projects/${id(projectId)}/material-usage`,
    stockCounts: "/stock-counts",
  },

  procurement: {
    purchaseOrders: "/purchase-orders",
    purchaseOrderById: (orderId: string) => `/purchase-orders/${id(orderId)}`,
    purchaseOrderCancel: (orderId: string) => `/purchase-orders/${id(orderId)}/cancel`,
    purchases: "/purchases",
    purchaseById: (purchaseId: string) => `/purchases/${id(purchaseId)}`,
    purchaseRates: (purchaseId: string) => `/purchases/${id(purchaseId)}/rates`,
    purchaseCorrections: (purchaseId: string) => `/purchases/${id(purchaseId)}/corrections`,
    purchaseReturns: (purchaseId: string) => `/purchases/${id(purchaseId)}/returns`,
    purchaseReceive: (purchaseId: string) => `/purchases/${id(purchaseId)}/receive`,
    returns: "/purchase-returns",
    supplierLedger: (supplierId: string) => `/suppliers/${id(supplierId)}/ledger`,
    supplierPayments: "/supplier-payments",
    chequeStatus: (paymentId: string) => `/supplier-payments/${id(paymentId)}/cheque-status`,
  },

  dispatch: {
    list: "/dispatches",
    byId: (dispatchId: string) => `/dispatches/${id(dispatchId)}`,
    cancel: (dispatchId: string) => `/dispatches/${id(dispatchId)}/cancel`,
    receive: (dispatchId: string) => `/dispatches/${id(dispatchId)}/receive`,
    incoming: (projectId: string) => `/projects/${id(projectId)}/incoming`,
    shortages: "/shortages",
    resolveShortage: (shortageId: string) => `/shortages/${id(shortageId)}/resolve`,
    ownerDeliveries: (projectId: string) => `/projects/${id(projectId)}/owner-deliveries`,
  },

  /** Step 13 — schedule: Gantt, milestones, quotas, stoppage days, delays. */
  schedule: {
    detail: (projectId: string) => `/projects/${id(projectId)}/schedule`,
    generate: (projectId: string) => `/projects/${id(projectId)}/schedule/generate`,
    replan: (projectId: string) => `/projects/${id(projectId)}/schedule/replan`,
    baseline: (projectId: string) => `/projects/${id(projectId)}/schedule/baseline`,
    versions: (projectId: string) => `/projects/${id(projectId)}/schedule/versions`,
    delays: (projectId: string) => `/projects/${id(projectId)}/schedule/delays`,
    quotas: (projectId: string) => `/projects/${id(projectId)}/schedule/quotas`,
    milestone: (milestoneId: string) => `/milestones/${id(milestoneId)}`,
    milestoneProgress: (milestoneId: string) => `/milestones/${id(milestoneId)}/progress`,
    stoppages: (projectId: string) => `/projects/${id(projectId)}/stoppages`,
    stoppageApprove: (stoppageId: string) => `/stoppages/${id(stoppageId)}/approve`,
    stoppageReject: (stoppageId: string) => `/stoppages/${id(stoppageId)}/reject`,
  },

  /** Step 14 — control: variance, burn rate, delay analysis, alerts, thresholds. */
  control: {
    materialVariance: (projectId: string) => `/projects/${id(projectId)}/control/material-variance`,
    costVariance: (projectId: string) => `/projects/${id(projectId)}/control/cost-variance`,
    burnRate: (projectId: string) => `/projects/${id(projectId)}/control/burn-rate`,
    delayAnalysis: (projectId: string) => `/projects/${id(projectId)}/control/delay-analysis`,
    projectAlerts: (projectId: string) => `/projects/${id(projectId)}/control/alerts`,
    summary: "/control/summary",
    alerts: "/control/alerts",
    rules: "/control/alerts/rules",
    run: "/control/alerts/run",
    settings: "/control/settings",
  },

  /** Step 16 — equipment & shuttering. */
  equipment: {
    list: "/equipment",
    byId: (equipmentId: string) => `/equipment/${id(equipmentId)}`,
    stockIn: (equipmentId: string) => `/equipment/${id(equipmentId)}/stock-in`,
    adjust: (equipmentId: string) => `/equipment/${id(equipmentId)}/adjust`,
    balances: "/equipment/balances",
    movements: "/equipment/movements",
    transfers: "/equipment/transfers",
    transferById: (transferId: string) => `/equipment/transfers/${id(transferId)}`,
    transferReceive: (transferId: string) => `/equipment/transfers/${id(transferId)}/receive`,
    transferCancel: (transferId: string) => `/equipment/transfers/${id(transferId)}/cancel`,
    rentals: "/equipment/rentals",
    rentalById: (rentalId: string) => `/equipment/rentals/${id(rentalId)}`,
    rentalExtend: (rentalId: string) => `/equipment/rentals/${id(rentalId)}/extend`,
    rentalReturn: (rentalId: string) => `/equipment/rentals/${id(rentalId)}/return`,
    rentalClose: (rentalId: string) => `/equipment/rentals/${id(rentalId)}/close`,
    losses: "/equipment/losses",
    lossById: (lossId: string) => `/equipment/losses/${id(lossId)}`,
    lossCharge: (lossId: string) => `/equipment/losses/${id(lossId)}/charge`,
    charges: "/equipment/charges",
    accrualsRun: "/equipment/accruals/run",
    project: (projectId: string) => `/projects/${id(projectId)}/equipment`,
    shutteringDemand: "/equipment/shuttering-demand",
    idle: "/equipment/idle",
    idleCheck: "/equipment/idle/check",
  },

  labor: {
    projectWorkers: (projectId: string) => `/projects/${id(projectId)}/labor/workers`,
    projectWorkerById: (projectWorkerId: string) => `/project-workers/${id(projectWorkerId)}`,
    subcontracts: (projectId: string) => `/projects/${id(projectId)}/labor/subcontracts`,
    subcontractById: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}`,
    attendance: (projectId: string) => `/projects/${id(projectId)}/attendance`,
    attendanceToday: (projectId: string) => `/projects/${id(projectId)}/attendance/today`,
    measurements: (projectId: string) => `/projects/${id(projectId)}/work-measurements`,
    measurementVerify: (measurementId: string) => `/work-measurements/${id(measurementId)}/verify`,
    measurementReject: (measurementId: string) => `/work-measurements/${id(measurementId)}/reject`,
    advances: (projectId: string) => `/projects/${id(projectId)}/advances`,
    generateSettlement: (projectId: string) => `/projects/${id(projectId)}/settlements/generate`,
    projectSettlements: (projectId: string) => `/projects/${id(projectId)}/settlements`,
    settlements: "/settlements",
    settlementById: (settlementId: string) => `/settlements/${id(settlementId)}`,
    settlementLine: (settlementId: string, lineId: string) =>
      `/settlements/${id(settlementId)}/lines/${id(lineId)}`,
    settlementSubmit: (settlementId: string) => `/settlements/${id(settlementId)}/submit`,
    settlementApprove: (settlementId: string) => `/settlements/${id(settlementId)}/approve`,
    settlementReturn: (settlementId: string) => `/settlements/${id(settlementId)}/return`,
    settlementPay: (settlementId: string) => `/settlements/${id(settlementId)}/pay`,
    subcontractAccounts: (projectId: string) => `/projects/${id(projectId)}/subcontract-accounts`,
    subcontractLedger: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/ledger`,
    subcontractProgress: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/progress`,
    subcontractPayments: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/payments`,
    subcontractDeductions: (assignmentId: string) =>
      `/subcontract-assignments/${id(assignmentId)}/deductions`,
    overview: "/labor/overview",
    workerSummary: (workerId: string) => `/workers/${id(workerId)}/labor-summary`,
    subcontractorSummary: (subcontractorId: string) => `/subcontractors/${id(subcontractorId)}/labor-summary`,
  },

  cashbook: {
    accounts: "/cash-accounts",
    accountById: (accountId: string) => `/cash-accounts/${id(accountId)}`,
    accountEntries: (accountId: string) => `/cash-accounts/${id(accountId)}/entries`,
    floats: "/cash-floats",
    floatAcknowledge: (entryId: string) => `/cash-floats/${id(entryId)}/acknowledge`,
    expenses: "/cash-expenses",
    expenseApprove: (entryId: string) => `/cash-expenses/${id(entryId)}/approve`,
    expenseReject: (entryId: string) => `/cash-expenses/${id(entryId)}/reject`,
    topups: "/topup-requests",
    topupApprove: (topupId: string) => `/topup-requests/${id(topupId)}/approve`,
    topupReject: (topupId: string) => `/topup-requests/${id(topupId)}/reject`,
    counts: "/cash-counts",
    handovers: "/cash-handovers",
    projectCashbook: (projectId: string) => `/projects/${id(projectId)}/cashbook`,
  },

  billing: {
    stages: (projectId: string) => `/projects/${id(projectId)}/billing-stages`,
    stageById: (stageId: string) => `/billing-stages/${id(stageId)}`,
    stageMarkReady: (stageId: string) => `/billing-stages/${id(stageId)}/mark-ready`,
    progress: (projectId: string) => `/projects/${id(projectId)}/billing-progress`,
    progressById: (progressId: string) => `/billing-progress/${id(progressId)}`,
    invoices: (projectId: string) => `/projects/${id(projectId)}/invoices`,
    invoiceById: (invoiceId: string) => `/invoices/${id(invoiceId)}`,
    invoiceIssue: (invoiceId: string) => `/invoices/${id(invoiceId)}/issue`,
    invoiceCancel: (invoiceId: string) => `/invoices/${id(invoiceId)}/cancel`,
    invoicePdf: (invoiceId: string) => `/invoices/${id(invoiceId)}/pdf`,
    payments: (projectId: string) => `/projects/${id(projectId)}/payments`,
    paymentById: (paymentId: string) => `/payments/${id(paymentId)}`,
    chequeStatus: (paymentId: string) => `/payments/${id(paymentId)}/cheque-status`,
    receiptPdf: (paymentId: string) => `/payments/${id(paymentId)}/receipt-pdf`,
    projectReceivables: (projectId: string) => `/projects/${id(projectId)}/receivables`,
    receivables: "/receivables",
    statement: (projectId: string) => `/projects/${id(projectId)}/owner-statement`,
    statementPdf: (projectId: string) => `/projects/${id(projectId)}/owner-statement/pdf`,
    events: "/billing-events",
  },

  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    read: (notificationId: string) => `/notifications/${id(notificationId)}/read`,
    readAll: "/notifications/read-all",
  },

  approvals: {
    list: "/approvals",
    bulk: "/approvals/bulk",
  },

  dashboard: {
    overview: "/dashboard/overview",
    site: (projectId: string) => `/dashboard/site/${id(projectId)}`,
  },

  finance: {
    receivables: "/finance/receivables",
    cashFlow: "/finance/cash-flow",
    pnl: "/finance/pnl",
    cashFloats: "/finance/cash-floats",
  },

  /** Step 11 — estimate revisions and the company rulebook. */
  estimates: {
    byId: (estimateId: string) => `/estimates/${id(estimateId)}`,
    regenerate: (estimateId: string) => `/estimates/${id(estimateId)}/regenerate`,
    line: (estimateId: string, lineId: string) => `/estimates/${id(estimateId)}/lines/${id(lineId)}`,
    approve: (estimateId: string) => `/estimates/${id(estimateId)}/approve`,
    compare: (a: string, b: string) => `/estimates/${id(a)}/compare/${id(b)}`,
    pdf: (estimateId: string) => `/estimates/${id(estimateId)}/pdf`,
  },
  rulebook: {
    resolved: "/rulebook",
    overrides: "/rulebook/overrides",
    override: (key: string) => `/rulebook/overrides/${id(key)}`,
  },

  reports: {
    byName: (name: string) => `/reports/${id(name)}`,
    /** Step 18 · one project's report book (delay analysis, variance, snags). */
    book: (name: string, projectId: string) => `/reports/${id(name)}/${id(projectId)}`,
  },

  admin: {
    overview: "/admin/overview",
    health: "/admin/health",
    tenants: "/admin/tenants",
    tenantById: (tenantId: string) => `/admin/tenants/${id(tenantId)}`,
    tenantStatus: (tenantId: string) => `/admin/tenants/${id(tenantId)}/status`,
    tenantPlan: (tenantId: string) => `/admin/tenants/${id(tenantId)}/plan`,
    /** Read-only look into a company (each look is audited). */
    tenantProjects: (tenantId: string) => `/admin/tenants/${id(tenantId)}/projects`,
    tenantTeam: (tenantId: string) => `/admin/tenants/${id(tenantId)}/team`,
    tenantActivity: (tenantId: string) => `/admin/tenants/${id(tenantId)}/activity`,
    payments: "/admin/payments",
    paymentById: (paymentId: string) => `/admin/payments/${id(paymentId)}`,
    paymentApprove: (paymentId: string) => `/admin/payments/${id(paymentId)}/approve`,
    paymentReject: (paymentId: string) => `/admin/payments/${id(paymentId)}/reject`,
    plans: "/admin/plans",
    planById: (planId: string) => `/admin/plans/${id(planId)}`,
    holidays: "/admin/holidays",
    holidayById: (holidayId: string) => `/admin/holidays/${id(holidayId)}`,
    auditLogs: "/admin/audit-logs",
    materialGroups: "/admin/material-groups",
    materials: "/admin/materials",
    materialById: (materialId: string) => `/admin/materials/${id(materialId)}`,
    rulebooks: "/admin/rulebooks",
    rulebookById: (rulebookId: string) => `/admin/rulebooks/${id(rulebookId)}`,
    rulebookParameter: (rulebookId: string, key: string) => `/admin/rulebooks/${id(rulebookId)}/parameters/${id(key)}`,
    rulebookPublish: (rulebookId: string) => `/admin/rulebooks/${id(rulebookId)}/publish`,
  },
} as const;
