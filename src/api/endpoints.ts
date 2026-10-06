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
  },

  users: {
    list: "/users",
    byId: (userId: string) => `/users/${id(userId)}`,
    reactivate: (userId: string) => `/users/${id(userId)}/reactivate`,
    projects: (userId: string) => `/users/${id(userId)}/projects`,
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

  clients: {
    list: "/clients",
    byId: (clientId: string) => `/clients/${id(clientId)}`,
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
    plotStructure: (projectId: string) => `/projects/${id(projectId)}/plot-structure`,
    coverage: (projectId: string) => `/projects/${id(projectId)}/coverage`,
    floors: (projectId: string) => `/projects/${id(projectId)}/floors`,
    supplyPresets: "/supply-presets",
    floorRooms: (floorId: string) => `/floors/${id(floorId)}/rooms`,
    floorCopy: (floorId: string) => `/floors/${id(floorId)}/copy`,
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
    settlementLine: (settlementId: string, lineId: string) => `/settlements/${id(settlementId)}/lines/${id(lineId)}`,
    settlementSubmit: (settlementId: string) => `/settlements/${id(settlementId)}/submit`,
    settlementApprove: (settlementId: string) => `/settlements/${id(settlementId)}/approve`,
    settlementReturn: (settlementId: string) => `/settlements/${id(settlementId)}/return`,
    settlementPay: (settlementId: string) => `/settlements/${id(settlementId)}/pay`,
    subcontractAccounts: (projectId: string) => `/projects/${id(projectId)}/subcontract-accounts`,
    subcontractLedger: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/ledger`,
    subcontractProgress: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/progress`,
    subcontractPayments: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/payments`,
    subcontractDeductions: (assignmentId: string) => `/subcontract-assignments/${id(assignmentId)}/deductions`,
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

  admin: {
    overview: "/admin/overview",
    health: "/admin/health",
    tenants: "/admin/tenants",
    tenantById: (tenantId: string) => `/admin/tenants/${id(tenantId)}`,
    tenantStatus: (tenantId: string) => `/admin/tenants/${id(tenantId)}/status`,
    tenantPlan: (tenantId: string) => `/admin/tenants/${id(tenantId)}/plan`,
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
  },
} as const;
