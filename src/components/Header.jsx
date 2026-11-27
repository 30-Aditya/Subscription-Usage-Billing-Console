function Header({ title, subtitle }) {
  return (
    <header className="header">
      <div>
        <p className="header-eyebrow">SUBSCRIPTION &amp; BILLING</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className="demo-label"><span /> Demo mode</span>
    </header>
  )
}

export default Header