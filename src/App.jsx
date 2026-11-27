import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import { createSampleData } from './data/initialData'
import { loadAppData, saveAppData } from './utils/storage'
import './App.css'

const PAGE_DETAILS = {
  Dashboard: ['Dashboard', 'Subscription usage and billing overview'],
  Customers: ['Customers', 'Manage customer profiles and subscriptions'],
  Plans: ['Subscription plans', 'Demonstration pricing and customer assignments'],
  Usage: ['Usage monitoring', 'Track and simulate customer API usage'],
  Invoices: ['Invoices', 'Review and simulate billing activity'],
  Notifications: ['Notifications', 'Demo alerts for usage and billing events'],
  Settings: ['Demo settings', 'Manage this browser’s sample application data'],
}

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

function usagePercent(customer, plan) {
  if (!plan?.usageLimit) return customer.usage > 0 ? 100 : 0
  return Math.max(0, (Number(customer.usage) / Number(plan.usageLimit)) * 100)
}

function nextInvoiceId(invoices) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const match = /^INV-(\d+)$/.exec(invoice.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 1022)
  return `INV-${highestNumber + 1}`
}

function App() {
  const [data, setData] = useState(loadAppData)
  const [activePage, setActivePage] = useState('Dashboard')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerModal, setCustomerModal] = useState(null)
  const [invoiceModal, setInvoiceModal] = useState(null)
  const [invoiceFilter, setInvoiceFilter] = useState('All')
  const [usageAmounts, setUsageAmounts] = useState({})
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(false)

  const planById = useMemo(
    () => Object.fromEntries(data.plans.map((plan) => [plan.id, plan])),
    [data.plans],
  )

  const customerById = useMemo(
    () => Object.fromEntries(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  )

  const activeCustomers = data.customers.filter((customer) => customer.status === 'Active')
  const monthlyRevenue = activeCustomers.reduce(
    (total, customer) => total + (planById[customer.planId]?.price ?? 0),
    0,
  )
  const failedPayments = data.invoices.filter((invoice) => invoice.status === 'Failed').length
  const totalUsage = data.customers.reduce((total, customer) => total + Number(customer.usage || 0), 0)
  const totalLimit = data.customers.reduce(
    (total, customer) => total + Number(planById[customer.planId]?.usageLimit || 0),
    0,
  )
  const overallUsage = totalLimit ? Math.round((totalUsage / totalLimit) * 100) : 0
  const unreadNotifications = data.notifications.filter((item) => !item.read).length
  const [title, subtitle] = PAGE_DETAILS[activePage]

  function updateData(updater) {
    const next = typeof updater === 'function' ? updater(data) : updater
    setData(next)
    setStorageError(!saveAppData(next))
    setNotice('')
  }

  function saveCustomer(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const planId = String(formData.get('planId') || '')
    const status = String(formData.get('status') || '')

    if (!name || !email || !planById[planId] || !['Active', 'Past due', 'Canceled'].includes(status)) {
      setNotice('Complete each field with a valid plan and subscription status.')
      return
    }

    const existing = customerModal?.customer
    const customer = existing
      ? { ...existing, name, email, planId, status }
      : {
          id: `customer-${Date.now()}`,
          name,
          email,
          planId,
          status,
          usage: 0,
        }

    updateData((current) => ({
      ...current,
      customers: existing
        ? current.customers.map((item) => (item.id === existing.id ? customer : item))
        : [...current.customers, customer],
    }))
    setCustomerModal(null)
    setNotice(existing ? 'Customer details updated.' : 'Customer added successfully.')
  }

  function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.name}? Their invoices will remain in the demo history.`)) return

    updateData((current) => ({
      ...current,
      customers: current.customers.filter((item) => item.id !== customer.id),
    }))
    setNotice(`${customer.name} was deleted.`)
  }

  function changePlan(customerId, planId) {
    if (!planById[planId]) {
      setNotice('Choose one of the available plans.')
      return
    }
    updateData((current) => ({
      ...current,
      customers: current.customers.map((customer) =>
        customer.id === customerId ? { ...customer, planId } : customer,
      ),
    }))
    setNotice('Plan assignment updated. Usage is retained; the new limit applies immediately.')
  }

  function addUsage(customer) {
    const amount = Number(usageAmounts[customer.id])
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      setNotice('Enter a usage amount greater than zero and no more than 1,000,000,000.')
      return
    }

    const nextUsage = Number(customer.usage) + amount
    const plan = planById[customer.planId]
    const limit = Number(plan?.usageLimit || 0)
    const wasHigh = usagePercent(customer, plan) >= 80
    const isHigh = limit === 0 ? nextUsage > 0 : (nextUsage / limit) * 100 >= 80
    const shouldNotify = isHigh && !wasHigh

    updateData((current) => ({
      ...current,
      customers: current.customers.map((item) =>
        item.id === customer.id ? { ...item, usage: nextUsage } : item,
      ),
      notifications: shouldNotify
        ? [
            {
              id: `notification-${Date.now()}`,
              title: 'High usage detected',
              message: `${customer.name} has reached at least 80% of the ${plan?.name || 'assigned'} plan limit.`,
              type: 'High usage',
              date: today(),
              read: false,
            },
            ...current.notifications,
          ]
        : current.notifications,
    }))
    setUsageAmounts((current) => ({ ...current, [customer.id]: '' }))
    setNotice(`${amount.toLocaleString()} usage units added for ${customer.name}.`)
  }

  function generateInvoice(customer) {
    const plan = planById[customer.planId]
    if (!plan) {
      setNotice('Assign a valid plan before generating an invoice.')
      return
    }
    const invoice = {
      id: nextInvoiceId(data.invoices),
      customerId: customer.id,
      planId: plan.id,
      amount: Number(plan.price),
      date: today(),
      status: 'Pending',
    }
    updateData((current) => ({ ...current, invoices: [invoice, ...current.invoices] }))
    setNotice(`Simulated invoice ${invoice.id} created. No payment was taken.`)
  }

  function updateInvoiceStatus(invoice, status) {
    updateData((current) => ({
      ...current,
      invoices: current.invoices.map((item) =>
        item.id === invoice.id ? { ...item, status } : item,
      ),
      notifications:
        status === 'Failed'
          ? [
              {
                id: `notification-${Date.now()}`,
                title: 'Simulated payment failure',
                message: `${customerById[invoice.customerId]?.name || 'A customer'} has a failed demo invoice (${invoice.id}).`,
                type: 'Payment failure',
                date: today(),
                read: false,
              },
              ...current.notifications,
            ]
          : current.notifications,
    }))
    setInvoiceModal((current) => (current?.id === invoice.id ? { ...current, status } : current))
    setNotice(`Invoice marked ${status.toLowerCase()} in the demo.`)
  }

  function markNotificationRead(notificationId) {
    updateData((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    }))
  }

  function restoreSamples() {
    if (!window.confirm('Restore sample data? This replaces all current demo customers, plans, invoices and notifications.')) {
      return
    }
    updateData(createSampleData())
    setNotice('Sample data restored.')
  }

  function renderDashboard() {
    const usageCustomers = [...data.customers]
      .sort((a, b) => usagePercent(b, planById[b.planId]) - usagePercent(a, planById[a.planId]))
      .slice(0, 4)
    const recentInvoices = [...data.invoices].slice(0, 4)

    return (
      <>
        <section className="stats">
          <StatCard label="Total customers" value={data.customers.length} />
          <StatCard label="Active subscriptions" value={activeCustomers.length} />
          <StatCard label="Monthly revenue (simulated)" value={CURRENCY.format(monthlyRevenue)} />
          <StatCard label="Failed payments" value={failedPayments} />
        </section>
        <section className="stats stats-secondary">
          <StatCard label="Total usage units" value={totalUsage.toLocaleString()} />
          <StatCard label="Overall plan usage" value={`${overallUsage}%`} />
          <StatCard label="Unread notifications" value={unreadNotifications} />
          <StatCard label="Demo data" value="Local only" />
        </section>
        <section className="dashboard-grid">
          <div className="panel">
            <PanelHeading title="Usage monitoring" description="Customer usage against assigned plan limits" />
            {usageCustomers.length ? usageCustomers.map((customer) => (
              <UsageBar key={customer.id} customer={customer} plan={planById[customer.planId]} />
            )) : <EmptyState message="Add a customer to start monitoring usage." />}
          </div>
          <div className="panel">
            <PanelHeading title="Recent invoices" description="Latest simulated billing activity" />
            {recentInvoices.length ? recentInvoices.map((invoice) => (
              <button className="invoice invoice-button" key={invoice.id} onClick={() => setInvoiceModal(invoice)}>
                <span className="invoice-main">
                  <strong>{invoice.id}</strong>
                  <span>{customerById[invoice.customerId]?.name || 'Deleted customer'} · {invoice.status}</span>
                </span>
                <strong>{CURRENCY.format(invoice.amount)}</strong>
              </button>
            )) : <EmptyState message="No invoices yet. Generate one from the Invoices page." />}
            <button className="text-button" onClick={() => setActivePage('Invoices')}>View all invoices</button>
          </div>
        </section>
      </>
    )
  }

  function renderCustomers() {
    const query = customerQuery.trim().toLowerCase()
    const filtered = data.customers.filter((customer) =>
      `${customer.name} ${customer.email}`.toLowerCase().includes(query),
    )

    return (
      <section className="panel">
        <div className="panel-toolbar">
          <PanelHeading title="Customer directory" description={`${filtered.length} of ${data.customers.length} customers`} />
          <button className="primary-button" onClick={() => setCustomerModal({ customer: null })}>Add customer</button>
        </div>
        <label className="search-field">
          <span className="sr-only">Search customers by name or email</span>
          <input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search name or email" />
        </label>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>Usage</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong><span className="cell-subtitle">{customer.email}</span></td>
                  <td>{planById[customer.planId]?.name || 'Unassigned'}</td>
                  <td><StatusBadge status={customer.status} /></td>
                  <td>{Number(customer.usage).toLocaleString()} units</td>
                  <td className="table-actions">
                    <button className="small-button" onClick={() => setCustomerModal({ customer })}>Edit</button>
                    <button className="small-button danger-text" onClick={() => deleteCustomer(customer)}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState message={data.customers.length ? 'No customers match your search.' : 'No customers yet. Add one to get started.'} />}
      </section>
    )
  }

  function renderPlans() {
    return (
      <>
        <div className="demo-banner">All prices and usage limits below are demonstration figures. No real subscription is created.</div>
        <section className="plan-grid">
          {data.plans.map((plan) => (
            <article className="panel plan-card" key={plan.id}>
              <span className="eyebrow">Subscription plan</span>
              <h2>{plan.name}</h2>
              <p className="plan-price">{CURRENCY.format(plan.price)}<span> / month</span></p>
              <p className="plan-limit">{Number(plan.usageLimit).toLocaleString()} API usage units</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <div className="plan-assignment">
                <strong>Assign this plan</strong>
                <label>
                  <span className="sr-only">Select customer for {plan.name} plan</span>
                  <select value="" onChange={(event) => event.target.value && changePlan(event.target.value, plan.id)}>
                    <option value="">Choose customer…</option>
                    {data.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} — {planById[customer.planId]?.name}</option>)}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </section>
        {!data.plans.length && <EmptyState message="No plans are available in the saved demo data." />}
        <section className="panel">
          <PanelHeading title="Current subscriptions" description="Change a customer's plan; the new usage limit applies immediately." />
          {data.customers.length ? (
            <div className="table-scroll"><table>
              <thead><tr><th>Customer</th><th>Current plan</th><th>Change plan</th></tr></thead>
              <tbody>{data.customers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong><span className="cell-subtitle">{customer.email}</span></td>
                  <td>{planById[customer.planId]?.name || 'Unassigned'}</td>
                  <td><select aria-label={`Change plan for ${customer.name}`} value={customer.planId} onChange={(event) => changePlan(customer.id, event.target.value)}>
                    {!planById[customer.planId] && <option value="">Select a plan</option>}
                    {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {CURRENCY.format(plan.price)}/mo</option>)}
                  </select></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <EmptyState message="Add a customer before assigning a plan." />}
        </section>
      </>
    )
  }

  function renderUsage() {
    return (
      <>
        <div className="demo-banner">Usage simulation changes only this browser’s saved demo data. Values are not sent to a service.</div>
        <section className="panel">
          <PanelHeading title="Customer usage" description="Usage percentage is current units divided by the assigned plan limit." />
          {data.customers.length ? data.customers.map((customer) => {
            const plan = planById[customer.planId]
            const percent = usagePercent(customer, plan)
            const state = percent >= 100 ? 'Over limit' : percent >= 80 ? 'High usage' : 'Normal'
            return (
              <div className="usage-row" key={customer.id}>
                <div className="usage-row-head">
                  <div><strong>{customer.name}</strong><span>{plan?.name || 'No plan'} · {Number(customer.usage).toLocaleString()} / {Number(plan?.usageLimit || 0).toLocaleString()} units</span></div>
                  <StatusBadge status={state} />
                </div>
                <UsageBar customer={customer} plan={plan} />
                <form className="usage-simulate" onSubmit={(event) => { event.preventDefault(); addUsage(customer) }}>
                  <label>
                    <span className="sr-only">Usage units to add for {customer.name}</span>
                    <input type="number" min="1" max="1000000000" step="1" placeholder="Units to add" value={usageAmounts[customer.id] ?? ''} onChange={(event) => setUsageAmounts((current) => ({ ...current, [customer.id]: event.target.value }))} />
                  </label>
                  <button className="small-button" type="submit">Simulate usage</button>
                </form>
              </div>
            )
          }) : <EmptyState message="No customers to monitor. Add customers on the Customers page." />}
        </section>
      </>
    )
  }

  function renderInvoices() {
    const filtered = data.invoices.filter((invoice) => invoiceFilter === 'All' || invoice.status === invoiceFilter)
    return (
      <section className="panel">
        <div className="panel-toolbar">
          <PanelHeading title="Invoice history" description="Demo billing only; this does not process a payment." />
          <label className="filter-field"><span>Filter</span><select value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}>
            {['All', 'Pending', 'Paid', 'Failed'].map((status) => <option key={status}>{status}</option>)}
          </select></label>
        </div>
        <div className="billing-action">
          <label htmlFor="invoice-customer">Generate simulated invoice for</label>
          <select id="invoice-customer" value="" onChange={(event) => {
            const customer = customerById[event.target.value]
            if (customer) generateInvoice(customer)
            event.target.value = ''
          }}>
            <option value="">Choose a customer…</option>
            {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {planById[customer.planId]?.name || 'No plan'}</option>)}
          </select>
        </div>
        {filtered.length ? (
          <div className="table-scroll"><table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>{filtered.map((invoice) => (
              <tr key={invoice.id}>
                <td><strong>{invoice.id}</strong></td>
                <td>{customerById[invoice.customerId]?.name || 'Deleted customer'}</td>
                <td>{planById[invoice.planId]?.name || 'Plan unavailable'}</td>
                <td>{CURRENCY.format(invoice.amount)}</td>
                <td>{DATE_FORMAT.format(new Date(`${invoice.date}T00:00:00Z`))}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td><button className="small-button" onClick={() => setInvoiceModal(invoice)}>View</button></td>
              </tr>
            ))}</tbody>
            </table></div>
        ) : <EmptyState message={data.invoices.length ? `No ${invoiceFilter.toLowerCase()} invoices.` : 'No invoices yet. Generate a simulated invoice above.'} />}
      </section>
    )
  }

  function renderNotifications() {
    return (
      <section className="panel">
        <PanelHeading title="Demo notifications" description="Alerts are generated by usage and simulated billing actions." />
        {data.notifications.length ? data.notifications.map((item) => (
          <article className={`notification ${item.read ? 'is-read' : ''}`} key={item.id}>
            <div className="notification-copy">
              <div><strong>{item.title}</strong><StatusBadge status={item.type} /></div>
              <p>{item.message}</p>
              <span>{DATE_FORMAT.format(new Date(`${item.date}T00:00:00Z`))} · {item.read ? 'Read' : 'Unread'}</span>
            </div>
            {!item.read && <button className="small-button" onClick={() => markNotificationRead(item.id)}>Mark as read</button>}
          </article>
        )) : <EmptyState message="No notifications yet. Usage and simulated billing actions can generate demo alerts." />}
      </section>
    )
  }

  function renderSettings() {
    return (
      <section className="panel settings-panel">
        <PanelHeading title="Application data" description="This prototype stores its demo data in localStorage on this device." />
        <p>Restore the fictional sample customers, plans, invoices and notifications at any time. This replaces the current saved demo data.</p>
        <button className="primary-button" onClick={restoreSamples}>Restore sample data</button>
        <div className="demo-banner">No backend, database, external API or real payment gateway is connected. Invoice amounts are plan prices only; tax and proration are not calculated.</div>
      </section>
    )
  }

  const pages = {
    Dashboard: renderDashboard,
    Customers: renderCustomers,
    Plans: renderPlans,
    Usage: renderUsage,
    Invoices: renderInvoices,
    Notifications: renderNotifications,
    Settings: renderSettings,
  }

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} unreadCount={unreadNotifications} />
      <main className="main">
        <Header title={title} subtitle={subtitle} />
        {(storageError || notice) && <div className="notice" role="status">{storageError ? 'Changes could not be saved in this browser. They may be lost when you leave or reload.' : notice}<button aria-label="Dismiss message" onClick={() => { setNotice(''); setStorageError(false) }}>×</button></div>}
        {pages[activePage]()}
        <footer className="app-footer">Academic frontend prototype · All displayed billing and usage data is simulated.</footer>
      </main>
      {customerModal && (
        <CustomerDialog
          customer={customerModal.customer}
          plans={data.plans}
          onClose={() => setCustomerModal(null)}
          onSubmit={saveCustomer}
        />
      )}
      {invoiceModal && (
        <InvoiceDialog
          invoice={invoiceModal}
          customer={customerById[invoiceModal.customerId]}
          plan={planById[invoiceModal.planId]}
          onClose={() => setInvoiceModal(null)}
          onStatusChange={(status) => updateInvoiceStatus(invoiceModal, status)}
        />
      )}
    </div>
  )
}

function PanelHeading({ title, description }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div></div>
}

function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>
}

function StatusBadge({ status }) {
  const className = status.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
  return <span className={`status-badge status-${className}`}>{status}</span>
}

function useDialogAccessibility(dialogRef, onClose) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const previousFocus = document.activeElement
    const selector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    const getFocusableElements = () => Array.from(dialog.querySelectorAll(selector))
    getFocusableElements()[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements()
      if (!focusableElements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const focusIsInside = dialog.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || !focusIsInside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !focusIsInside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [dialogRef])
}

function UsageBar({ customer, plan }) {
  const percent = usagePercent(customer, plan)
  const displayPercent = Math.round(percent)
  const tone = percent >= 100 ? 'over' : percent >= 80 ? 'high' : ''
  return (
    <div className="usage-item">
      <div className="usage-info"><span>{customer.name}{plan ? ` · ${plan.name}` : ''}</span><span>{displayPercent}%</span></div>
      <div className="progress" role="progressbar" aria-label={`${customer.name} usage`} aria-valuenow={Math.min(100, displayPercent)} aria-valuemin="0" aria-valuemax="100">
        <div className={`progress-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  )
}

function CustomerDialog({ customer, plans, onClose, onSubmit }) {
  const dialogRef = useRef(null)
  useDialogAccessibility(dialogRef, onClose)

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="customer-dialog-title" tabIndex="-1">
        <div className="modal-heading"><div><h2 id="customer-dialog-title">{customer ? 'Edit customer' : 'Add customer'}</h2><p>All customer records are fictional demo data.</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>Full name<input name="name" required maxLength="80" defaultValue={customer?.name || ''} /></label>
          <label>Email address<input name="email" type="email" required maxLength="120" defaultValue={customer?.email || ''} /></label>
          <label>Subscription plan<select name="planId" required defaultValue={customer?.planId || plans[0]?.id || ''}>
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {CURRENCY.format(plan.price)}/mo</option>)}
          </select></label>
          <label>Status<select name="status" defaultValue={customer?.status || 'Active'}>
            <option>Active</option><option>Past due</option><option>Canceled</option>
          </select></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{customer ? 'Save changes' : 'Add customer'}</button></div>
        </form>
      </section>
    </div>
  )
}

function InvoiceDialog({ invoice, customer, plan, onClose, onStatusChange }) {
  const dialogRef = useRef(null)
  useDialogAccessibility(dialogRef, onClose)

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title" tabIndex="-1">
        <div className="modal-heading"><div><h2 id="invoice-dialog-title">Invoice details</h2><p>{invoice.id}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div>
        <dl className="invoice-details">
          <div><dt>Customer</dt><dd>{customer?.name || 'Deleted customer'}</dd></div>
          <div><dt>Plan</dt><dd>{plan?.name || 'Plan unavailable'}</dd></div>
          <div><dt>Amount</dt><dd>{CURRENCY.format(invoice.amount)}</dd></div>
          <div><dt>Invoice date</dt><dd>{DATE_FORMAT.format(new Date(`${invoice.date}T00:00:00Z`))}</dd></div>
          <div><dt>Status</dt><dd><StatusBadge status={invoice.status} /></dd></div>
        </dl>
        <p className="dialog-disclaimer">Demo invoice only. This action does not charge a payment method.</p>
        <div className="modal-actions">
          {invoice.status !== 'Paid' && <button className="primary-button" onClick={() => onStatusChange('Paid')}>Simulate as paid</button>}
          {invoice.status !== 'Failed' && <button className="danger-button" onClick={() => onStatusChange('Failed')}>Simulate failure</button>}
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  )
}

export default App
