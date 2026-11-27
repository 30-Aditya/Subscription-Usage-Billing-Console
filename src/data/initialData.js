export const SAMPLE_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    usageLimit: 10000,
    features: ['10,000 API requests', '5 team members', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    usageLimit: 50000,
    features: ['50,000 API requests', '20 team members', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    usageLimit: 200000,
    features: ['200,000 API requests', 'Unlimited team members', 'Dedicated support'],
  },
]

export const SAMPLE_CUSTOMERS = [
  {
    id: 'customer-1',
    name: 'Avery Morgan',
    email: 'avery.morgan@example.test',
    planId: 'pro',
    status: 'Active',
    usage: 36200,
  },
  {
    id: 'customer-2',
    name: 'Jordan Lee',
    email: 'jordan.lee@example.test',
    planId: 'basic',
    status: 'Active',
    usage: 7400,
  },
  {
    id: 'customer-3',
    name: 'Taylor Chen',
    email: 'taylor.chen@example.test',
    planId: 'enterprise',
    status: 'Past due',
    usage: 184000,
  },
]

export const SAMPLE_INVOICES = [
  {
    id: 'INV-1024',
    customerId: 'customer-1',
    planId: 'pro',
    amount: 79,
    date: '2026-10-28',
    status: 'Paid',
  },
  {
    id: 'INV-1023',
    customerId: 'customer-2',
    planId: 'basic',
    amount: 29,
    date: '2026-10-25',
    status: 'Pending',
  },
]

export const SAMPLE_NOTIFICATIONS = [
  {
    id: 'notification-1',
    title: 'Usage is approaching the plan limit',
    message: 'Taylor Chen has used 92% of the Enterprise allowance.',
    type: 'High usage',
    date: '2026-10-30',
    read: false,
  },
]

export function createSampleData() {
  return {
    plans: SAMPLE_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
    customers: SAMPLE_CUSTOMERS.map((customer) => ({ ...customer })),
    invoices: SAMPLE_INVOICES.map((invoice) => ({ ...invoice })),
    notifications: SAMPLE_NOTIFICATIONS.map((notification) => ({ ...notification })),
  }
}
