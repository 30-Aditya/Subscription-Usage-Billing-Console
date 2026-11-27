const navigationItems = ['Dashboard', 'Customers', 'Plans', 'Usage', 'Invoices', 'Notifications', 'Settings']

function Sidebar({ activePage, onNavigate, unreadCount }) {
  return (
    <aside className="sidebar">
      <div className="logo"><span className="logo-mark">S</span><span>SUBSCRIPTION<br /><small>COMMAND CONSOLE</small></span></div>
      <nav aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            className={`nav-link ${activePage === item ? 'active' : ''}`}
            key={item}
            onClick={() => onNavigate(item)}
            aria-current={activePage === item ? 'page' : undefined}
          >
            <span>{item}</span>
            {item === 'Notifications' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">Academic demo<br />Local browser data</div>
    </aside>
  )
}

export default Sidebar