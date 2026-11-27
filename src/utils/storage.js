import { createSampleData } from '../data/initialData'

const STORAGE_KEY = 'subscription-console-demo-data'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function hasValidRecords(data) {
  return (
    data.plans.every((plan) =>
      isRecord(plan) &&
      typeof plan.id === 'string' &&
      typeof plan.name === 'string' &&
      isNonNegativeNumber(plan.price) &&
      isNonNegativeNumber(plan.usageLimit) &&
      Array.isArray(plan.features) &&
      plan.features.every((feature) => typeof feature === 'string'),
    ) &&
    data.customers.every((customer) =>
      isRecord(customer) &&
      typeof customer.id === 'string' &&
      typeof customer.name === 'string' &&
      typeof customer.email === 'string' &&
      typeof customer.planId === 'string' &&
      ['Active', 'Past due', 'Canceled'].includes(customer.status) &&
      isNonNegativeNumber(customer.usage),
    ) &&
    data.invoices.every((invoice) =>
      isRecord(invoice) &&
      typeof invoice.id === 'string' &&
      typeof invoice.customerId === 'string' &&
      typeof invoice.planId === 'string' &&
      isNonNegativeNumber(invoice.amount) &&
      isDateString(invoice.date) &&
      ['Pending', 'Paid', 'Failed'].includes(invoice.status),
    ) &&
    data.notifications.every((notification) =>
      isRecord(notification) &&
      typeof notification.id === 'string' &&
      typeof notification.title === 'string' &&
      typeof notification.message === 'string' &&
      typeof notification.type === 'string' &&
      isDateString(notification.date) &&
      typeof notification.read === 'boolean',
    )
  )
}

export function loadAppData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createSampleData()

    const parsed = JSON.parse(saved)
    if (
      !parsed ||
      !Array.isArray(parsed.customers) ||
      !Array.isArray(parsed.plans) ||
      !Array.isArray(parsed.invoices) ||
      !Array.isArray(parsed.notifications) ||
      !hasValidRecords(parsed)
    ) {
      return createSampleData()
    }

    return parsed
  } catch (error) {
    console.error('Unable to load saved demo data:', error)
    return createSampleData()
  }
}

export function saveAppData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Unable to save demo data:', error)
    return false
  }
}
