import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';

// Animated Counter Component to match original animateTo logic
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const start = prevValueRef.current;
    const target = value;
    const t0 = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3); // cubic ease out
      const currentVal = Math.round(start + (target - start) * ease);
      setDisplayValue(currentVal);
      if (p < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    prevValueRef.current = target;
  }, [value, duration]);

  return <span>{String(displayValue).padStart(2, '0')}</span>;
};

function App() {
  const [counts, setCounts] = useState({ total: 0, litigation: 0, drafting: 0, judgment: 0, bundle: 0 });
  const [formData, setFormData] = useState({
    courses: [],
    name: '',
    email: '',
    phone: '',
    college: '',
    pincode: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [waitlistRecord, setWaitlistRecord] = useState(null);
  const [view, setView] = useState('landing'); // 'landing' or 'admin'
  const [registrations, setRegistrations] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);


  const signupRef = useRef(null);

  useEffect(() => {
    fetchCounts();
    
    // Simple hash-based routing
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setView('admin');
        fetchRegistrations();
      } else {
        setView('landing');
      }
    };
    
    window.addEventListener('hashchange', handleHash);
    handleHash(); // check on mount
    
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const fetchRegistrations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/registrations`);
      setRegistrations(res.data);
    } catch (err) {
      console.error('Error fetching registrations:', err);
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) return;
    
    const headers = ['Ref ID', 'Position', 'Name', 'Email', 'Phone', 'College', 'Pincode', 'Courses', 'Joined At'];
    const rows = registrations.map(reg => [
      reg.id,
      reg.position,
      reg.name,
      reg.email,
      reg.phone,
      reg.college,
      reg.pincode,
      reg.courses.join('; '),
      new Date(reg.joinedAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `legal_olympiad_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/counts`);
      setCounts(res.data);
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const field = id.replace('f-', '');
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      let newCourses;
      if (checked) {
        if (value === 'bundle') {
          // If bundle is selected, it's the only one
          newCourses = ['bundle'];
        } else {
          // If individual course is selected, remove bundle if it exists
          newCourses = [...prev.courses.filter(c => c !== 'bundle'), value];
        }
      } else {
        newCourses = prev.courses.filter(c => c !== value);
      }
      return { ...prev, courses: newCourses };
    });
    if (errors.courses) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.courses;
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (formData.courses.length === 0) newErrors.courses = true;
    if (!formData.name) newErrors.name = true;
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = true;
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = true;
    if (!formData.college) newErrors.college = true;
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) newErrors.pincode = true;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/waitlist`, formData);
      setWaitlistRecord(res.data);
      setIsSubmitted(true);
      fetchCounts();
      setTimeout(() => {
        signupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      courses: [],
      name: '',
      email: '',
      phone: '',
      college: '',
      pincode: ''
    });
    setErrors({});
    setIsSubmitted(false);
    setWaitlistRecord(null);
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectCourse = (course) => {
    setFormData(prev => ({ ...prev, courses: [course] }));
    signupRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredRegistrations = registrations.filter(reg => 
    reg.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    reg.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
    reg.college.toLowerCase().includes(adminSearch.toLowerCase()) ||
    reg.id.toLowerCase().includes(adminSearch.toLowerCase())
  );

  if (view === 'admin') {
    return (
      <div className="admin-layout">
        <nav className="top admin-nav">
          <div className="wrap nav-inner">
            <div className="logo">
              <img src="/logo.png" alt="Legal Admin" className="logo-img" />
              Legal <b>Admin</b>
            </div>
            <div className="nav-links">
              <a href="#" onClick={() => window.location.hash = ''} className="nav-cta">Back to Site</a>
            </div>
          </div>
        </nav>

        <main className="admin-main">
          <div className="wrap">
            <header className="admin-header">
              <div className="admin-header-left">
                <span className="eyebrow">Waitlist Management</span>
                <h1 className="admin-title">Student Registrations</h1>
                <p className="admin-sub">Monitor and manage all incoming waitlist entries for the June 2026 cohort.</p>
              </div>
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <span className="lbl">Total Students</span>
                  <span className="val">{registrations.length}</span>
                </div>
                <div className="admin-stat-card">
                  <span className="lbl">Today</span>
                  <span className="val">
                    {registrations.filter(r => new Date(r.joinedAt).toDateString() === new Date().toDateString()).length}
                  </span>
                </div>
              </div>
            </header>

            <div className="admin-controls">
              <div className="search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5" strokeLinecap="round"/></svg>
                <input 
                  type="text" 
                  placeholder="Search by name, email, college or ID..." 
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
              </div>
              <div className="admin-actions">
                <button className="btn-secondary btn-sm" onClick={exportToCSV} disabled={registrations.length === 0}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Export to Excel
                </button>
                <button className="btn-secondary btn-sm" onClick={fetchRegistrations}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Refresh
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Full Name</th>
                    <th>College / Institution</th>
                    <th>Email & Phone</th>
                    <th>Programmes</th>
                    <th>Joined At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg._id}>
                      <td className="col-id">
                        <code>{reg.id}</code>
                        <span className="pos">#{String(reg.position).padStart(3, '0')}</span>
                      </td>
                      <td className="col-name">
                        <strong>{reg.name}</strong>
                      </td>
                      <td className="col-college">{reg.college}</td>
                      <td className="col-contact">
                        <div className="email">{reg.email}</div>
                        <div className="phone">{reg.phone}</div>
                      </td>
                      <td className="col-courses">
                        <div className="course-tags">
                          {reg.courses.map(c => (
                            <span key={c} className={`course-tag ${c}`}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td className="col-date">
                        {new Date(reg.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <div className="time">{new Date(reg.joinedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                  {filteredRegistrations.length === 0 && (
                    <tr>
                      <td colSpan="6" className="no-results">No registrations found matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <footer className="admin-footer">
          <div className="wrap">
            © 2026 LEGAL OLYMPIAD · Admin Portal · Institutional Access Only
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      {/* ANNOUNCEMENT BAR */}
      <div className="announce">
        <strong>★ JUNE 2026 COHORT</strong> · Waitlist now open · Priority access for early signups <a href="#signup">Join →</a>
      </div>

      {/* NAVBAR */}
      <nav className={`top ${isMenuOpen ? 'menu-open' : ''}`}>
        <div className="wrap nav-inner">
          <div className="logo">
            <img src="/logo.png" alt="Legal Olympiad" className="logo-img" />
            Legal <b>Olympiad</b>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow"><span className="live"></span>Waitlist now open · Inaugural cohort starts June 2026</span>
          <h1 className="hero-title">
            The professional<br />
            training law school<br />
            <em>forgot to build.</em>
          </h1>
          <p className="hero-sub">
            Three rigorous, practitioner-led programmes that bridge the gap between <strong>knowing the law</strong> and <strong>practising it</strong>. Built with senior advocates, taught through real files, graded on the work you'll actually do in chambers.
          </p>
          <div className="hero-ctas">
            <a href="#signup" className="btn-primary">
              Join the waitlist
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="#courses" className="btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Explore programmes
            </a>
          </div>

          {/* COHORT CARD */}
          <div className="cohort-card">
            <div className="cohort-date">
              <span className="mo">JUN</span>
              <span className="yr">'26</span>
            </div>
            <div className="cohort-info">
              <h4>Inaugural Cohort · June 2026</h4>
              <p><strong>Limited to 40 students per batch</strong> to preserve mentorship quality. Waitlist signups get <strong>priority admission</strong> and <strong>early-bird pricing</strong> when seats open.</p>
            </div>
            <div className="cohort-cta-wrap">
              <a href="#signup" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Join waitlist →</a>
            </div>
          </div>

          <div className="hero-trust">
            <div className="trust-item"><span className="num">03</span><span className="lbl">FLAGSHIP PROGRAMMES</span></div>
            <div className="trust-item"><span className="num">11</span><span className="lbl">WEEKS OF TRAINING</span></div>
            <div className="trust-item"><span className="num">40</span><span className="lbl">SEATS PER BATCH</span></div>
            <div className="trust-item"><span className="num">1:1</span><span className="lbl">PRACTITIONER MENTORSHIP</span></div>
          </div>
        </div>
      </section>

      {/* CREDIBILITY STRIP */}
      <div className="credibility">
        <div className="wrap">
          <div className="cred-label">Curriculum designed with input from</div>
          <div className="cred-row">
            <span className="cred-item">Practising Advocates</span>
            <span className="cred-item">Senior Counsel</span>
            <span className="cred-item">Trial Court Judges</span>
            <span className="cred-item">Corporate Legal Teams</span>
            <span className="cred-item">Legal Research Scholars</span>
          </div>
        </div>
      </div>

      {/* PHILOSOPHY */}
      <section className="philosophy" id="philosophy">
        <div className="wrap">
          <div className="section-kicker">Our approach</div>
          <h2 className="section-title">
            Most graduates know <em>the law.</em><br />
            <span className="muted">Almost none know</span> the workflow.
          </h2>
          <p className="section-lede">We close that gap. Every module is taught through real files, real drafts, real hearings. You don't study advocacy. You practise it, supervised, from day one.</p>

          <div className="pillars">
            <div className="pillar">
              <div className="pillar-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h4>Research that wins cases</h4>
              <p>Move beyond textbook methodology into the research reflexes of seasoned juniors. SCC, Manupatra, statutory trees, precedent triage, all under real deadline pressure.</p>
            </div>
            <div className="pillar">
              <div className="pillar-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 4h12l4 4v12H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 10h8M8 14h8M8 18h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h4>Drafting as muscle memory</h4>
              <p>Plaints, written statements, sale deeds, wills, shareholder agreements. Taught through redlines and workshops, not lectures. You'll draft more in 4 weeks than in 3 years of law school.</p>
            </div>
            <div className="pillar">
              <div className="pillar-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="19" cy="18" r="2" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <h4>Judgment appreciation</h4>
              <p>Separate ratio from obiter on the first read. Argue binding precedent with authority. Spot the dissent that becomes law tomorrow. The analytical edge that defines a great lawyer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="courses" id="courses">
        <div className="wrap">
          <div className="courses-head">
            <div>
              <div className="section-kicker">Our programmes</div>
              <h2 className="section-title">Three paths.<br /><em>One transformation.</em></h2>
            </div>
            <span className="tag">Stackable · Sequenced · Certified</span>
          </div>

          <div className="course-grid">
            {/* Course 1 */}
            <article className="course-card">
              <div className="course-numeral">I</div>
              <div className="course-body">
                <div className="tagstrip">
                  <span className="pill dur">5 Weeks</span>
                  <span className="pill fmt">In-Person + Hybrid</span>
                  <span className="pill hot">★ Flagship</span>
                  <span className="pill start">Starts June 2026</span>
                </div>
                <h3>Litigation Training Programme</h3>
                <p className="pitch">From raw facts to oral argument. The end-to-end workflow of a litigating junior, compressed into five intensive weeks and capped with a live court visit and mock hearing.</p>
                <div className="syllabus">
                  <div>Research methodology &amp; precedent analysis</div>
                  <div>File preparation &amp; case note drafting</div>
                  <div>Issue identification &amp; proposition development</div>
                  <div>Drafting pleadings, affidavits &amp; applications</div>
                  <div>Live court observation</div>
                  <div>End-to-end mock hearing &amp; oral argument</div>
                </div>
              </div>
              <div className="course-side">
                <div>
                  <div className="price-lbl">Programme fee (indicative)</div>
                  <div className="price-val"><span className="r">₹</span>4,799</div>
                  <div className="price-strike">Standard ₹5,999</div>
                  <div className="no-pay-note">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    No payment now
                  </div>
                  <div className="wl-counter">
                    <span className="wl-lbl"><span className="wl-dot"></span>On waitlist</span>
                    <span className="wl-num" id="wl-litigation">{String(counts.litigation + counts.bundle).padStart(2, '0')}</span>
                  </div>
                </div>
                <button className="course-cta-btn" onClick={() => selectCourse('litigation')} type="button">
                  Join waitlist
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </article>

            {/* Course 2 */}
            <article className="course-card">
              <div className="course-numeral">II</div>
              <div className="course-body">
                <div className="tagstrip">
                  <span className="pill dur">4 Weeks</span>
                  <span className="pill fmt">Workshop-led</span>
                  <span className="pill hot">High ROI</span>
                  <span className="pill start">Starts June 2026</span>
                </div>
                <h3>Drafting &amp; Conveyancing</h3>
                <p className="pitch">The most commercially valuable course you'll take this year. Property, succession, corporate, litigation drafting, taught through redlining workshops that mirror real firm work.</p>
                <div className="syllabus">
                  <div>Principles of precise legal writing</div>
                  <div>Sale, lease, gift &amp; mortgage deeds</div>
                  <div>Wills, codicils &amp; trust deeds</div>
                  <div>Shareholder agreements &amp; NDAs</div>
                  <div>Plaints, written statements, petitions</div>
                  <div>Redlining &amp; peer review workshops</div>
                </div>
              </div>
              <div className="course-side">
                <div>
                  <div className="price-lbl">Programme fee (indicative)</div>
                  <div className="price-val"><span className="r">₹</span>3,599</div>
                  <div className="price-strike">Standard ₹4,499</div>
                  <div className="no-pay-note">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    No payment now
                  </div>
                  <div className="wl-counter">
                    <span className="wl-lbl"><span className="wl-dot"></span>On waitlist</span>
                    <span className="wl-num" id="wl-drafting">{String(counts.drafting + counts.bundle).padStart(2, '0')}</span>
                  </div>
                </div>
                <button className="course-cta-btn" onClick={() => selectCourse('drafting')} type="button">
                  Join waitlist
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </article>

            {/* Course 3 */}
            <article className="course-card">
              <div className="course-numeral">III</div>
              <div className="course-body">
                <div className="tagstrip">
                  <span className="pill dur">2 Weeks</span>
                  <span className="pill fmt">Analysis-heavy</span>
                  <span className="pill hot">Foundational</span>
                  <span className="pill start">Starts June 2026</span>
                </div>
                <h3>Judgment Appreciation</h3>
                <p className="pitch">The skill that separates students who memorise cases from lawyers who wield them. Break down landmark judgments, defend your reading under questioning, publish a paper.</p>
                <div className="syllabus">
                  <div>Curated landmark judgment reading pack</div>
                  <div>Foundations of judgment appreciation</div>
                  <div>Ratio vs obiter, precedent, interpretation</div>
                  <div>Critical evaluation &amp; dissent analysis</div>
                  <div>Paper presentation before peers</div>
                  <div>Thematic Q&amp;A sessions</div>
                </div>
              </div>
              <div className="course-side">
                <div>
                  <div className="price-lbl">Programme fee (indicative)</div>
                  <div className="price-val"><span className="r">₹</span>1,599</div>
                  <div className="price-strike">Standard ₹1,999</div>
                  <div className="no-pay-note">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    No payment now
                  </div>
                  <div className="wl-counter">
                    <span className="wl-lbl"><span className="wl-dot"></span>On waitlist</span>
                    <span className="wl-num" id="wl-judgment">{String(counts.judgment + counts.bundle).padStart(2, '0')}</span>
                  </div>
                </div>
                <button className="course-cta-btn" onClick={() => selectCourse('judgment')} type="button">
                  Join waitlist
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* BUNDLE */}
      <section className="bundle-section" id="bundle">
        <div className="wrap">
          <div className="bundle-card">
            <div>
              <span className="bundle-tag">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" /></svg>
                Best Value · Most Popular
              </span>
              <h3>The <em>Complete Advocate</em> Bundle</h3>
              <p>All three programmes. Eleven weeks of progressive training. One transformation from law student to courtroom-ready junior. Capped at 25 students per bundle cohort to preserve mentorship quality.</p>
              <div className="bundle-perks">
                <div className="bundle-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Litigation + Drafting + Judgment, fully sequenced
                </div>
                <div className="bundle-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Priority placement in live court visit batch
                </div>
                <div className="bundle-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Composite certification with merit recognition
                </div>
                <div className="bundle-perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Alumni access to chambers network
                </div>
              </div>
              <button className="bundle-cta" onClick={() => selectCourse('bundle')} type="button">
                Join bundle waitlist
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="bundle-right">
              <div className="bundle-price-lbl">Bundle fee (indicative)</div>
              <div className="bundle-was">Standard ₹12,497</div>
              <div className="bundle-now"><span className="r">₹</span>9,999</div>
              <span className="bundle-save">Save ₹2,498</span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE COUNTER */}
      <section className="counter">
        <div className="wrap counter-inner">
          <div className="counter-stats">
            <div className="c-stat"><span className="c-num" id="c-total"><AnimatedCounter value={counts.total} /></span><span className="c-lbl">Total on Waitlist</span></div>
            <div className="c-stat"><span className="c-num" id="c-litigation"><AnimatedCounter value={counts.litigation} /></span><span className="c-lbl">Litigation</span></div>
            <div className="c-stat"><span className="c-num" id="c-drafting"><AnimatedCounter value={counts.drafting} /></span><span className="c-lbl">Drafting</span></div>
            <div className="c-stat"><span className="c-num" id="c-judgment"><AnimatedCounter value={counts.judgment} /></span><span className="c-lbl">Judgment</span></div>
          </div>
          <div className="live-badge">
            <span style={{ width: '6px', height: '6px', background: '#16a34a', borderRadius: '50%', animation: 'breathe 2s infinite' }}></span>
            Live waitlist counter
          </div>
        </div>
      </section>

      {/* SIGNUP */}
      <section className="signup" id="signup" ref={signupRef}>
        <div className="wrap signup-grid">
          <div className="signup-left">
            <div className="section-kicker">Join the waitlist</div>
            <h2>No payment.<br /><em>Just your name.</em></h2>
            <p>We're preparing the June 2026 cohort with extraordinary care. Join the waitlist and you'll be among the first to know when enrolments open, with priority admission and early-bird pricing reserved for waitlist members.</p>

            <div className="assurances">
              <div className="assurance">
                <div className="assurance-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" strokeLinecap="round" /></svg>
                </div>
                <div>
                  <h5>Zero payment collected today</h5>
                  <p>This is a waitlist, not an enrolment. You pay only when you choose to formally enrol later.</p>
                </div>
              </div>
              <div className="assurance">
                <div className="assurance-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <h5>Priority admission &amp; early-bird rates</h5>
                  <p>Waitlist members get first access to seats and locked-in early-bird pricing when registration opens.</p>
                </div>
              </div>
              <div className="assurance">
                <div className="assurance-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <h5>Your details stay with us</h5>
                  <p>No spam, no third-party sharing. We contact you only about the June 2026 cohort and future batches.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {!isSubmitted ? (
              <form id="form" className="signup-card" onSubmit={handleSubmit} noValidate>
                <div className="form-label">WAITLIST · JUNE 2026 COHORT</div>
                <h3>Join the waitlist.</h3>
                <p className="form-sub"><strong>No payment collected.</strong> Takes under a minute.</p>

                <div className="field">
                  <label>Which programme(s) interest you? <span className="req">*</span></label>
                  <div className="picker" id="picker">
                    {['litigation', 'drafting', 'judgment', 'bundle'].map(course => (
                      <label key={course} className={`pick ${formData.courses.includes(course) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          name="courses" 
                          value={course} 
                          checked={formData.courses.includes(course)}
                          onChange={handleCheckboxChange}
                        />
                        <span className="pick-title">
                          {course === 'litigation' && 'Litigation Training'}
                          {course === 'drafting' && 'Drafting & Conveyancing'}
                          {course === 'judgment' && 'Judgment Appreciation'}
                          {course === 'bundle' && 'Complete Advocate Bundle'}
                        </span>
                        <span className="pick-meta">
                          {course === 'litigation' && '5 wk · ₹4,799'}
                          {course === 'drafting' && '4 wk · ₹3,599'}
                          {course === 'judgment' && '2 wk · ₹1,599'}
                          {course === 'bundle' && '11 wk · ₹9,999'}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className={`error-msg ${errors.courses ? 'show' : ''}`} id="err-courses">Please select at least one programme.</div>
                </div>

                <div className="field">
                  <label>Full name <span className="req">*</span></label>
                  <input type="text" id="f-name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Aarav Menon" autoComplete="name" />
                  <div className={`error-msg ${errors.name ? 'show' : ''}`} id="err-name">Please enter your full name.</div>
                </div>

                <div className="row2">
                  <div className="field">
                    <label>Email <span className="req">*</span></label>
                    <input type="email" id="f-email" value={formData.email} onChange={handleInputChange} placeholder="you@college.edu" autoComplete="email" />
                    <div className={`error-msg ${errors.email ? 'show' : ''}`} id="err-email">Please enter a valid email.</div>
                  </div>
                  <div className="field">
                    <label>Phone <span className="req">*</span></label>
                    <input type="tel" id="f-phone" value={formData.phone} onChange={handleInputChange} placeholder="10 digits" autoComplete="tel" />
                    <div className={`error-msg ${errors.phone ? 'show' : ''}`} id="err-phone">10-digit phone number required.</div>
                  </div>
                </div>

                <div className="row2">
                  <div className="field">
                    <label>College / Institution <span className="req">*</span></label>
                    <input type="text" id="f-college" value={formData.college} onChange={handleInputChange} placeholder="e.g. NLSIU, GLC Mumbai" />
                    <div className={`error-msg ${errors.college ? 'show' : ''}`} id="err-college">Please enter your college name.</div>
                  </div>
                  <div className="field">
                    <label>Pincode <span className="req">*</span></label>
                    <input type="text" id="f-pincode" value={formData.pincode} onChange={handleInputChange} placeholder="6 digits" maxLength="6" />
                    <div className={`error-msg ${errors.pincode ? 'show' : ''}`} id="err-pincode">Please enter a valid 6-digit pincode.</div>
                  </div>
                </div>

                <div className="submit-area">
                  <button type="submit" className="submit" id="submitBtn" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding you to waitlist...' : 'Join the waitlist'}
                    {!isSubmitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="submit-note">No payment now. You'll hear from us when enrolments open.</div>
                </div>
              </form>
            ) : (
              <div className="success-panel show" id="successPanel">
                <div className="success-ico">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3>You're on the waitlist.</h3>
                <p>We'll email you the moment enrolments open, with priority access and locked-in early-bird pricing. Expect first word ahead of the June 2026 cohort.</p>
                <div className="success-position">
                  <span className="pos-lbl">Your waitlist position</span>
                  <span className="pos-val" id="waitlistPos">#{String(waitlistRecord?.position || 0).padStart(3, '0')}</span>
                </div>
                <br />
                <div className="success-refid" id="refId">{waitlistRecord?.id}</div>
                <br />
                <button className="btn-secondary" onClick={resetForm}>Add another student</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap faq-grid">
          <div>
            <div className="section-kicker">Common questions</div>
            <h2 className="section-title">The <em>honest</em> answers.</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '15px', lineHeight: '1.6', maxWidth: '320px' }}>
              If your question isn't here, reach us at <a href="mailto:admissions@legalolympiad.in" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>admissions@legalolympiad.in</a>
            </p>
          </div>

          <div className="faq-list">
            {[
              { q: 'Is this a waitlist or an enrolment?', a: 'This is strictly a waitlist. No payment is collected and no seat is formally reserved. Waitlist members are the first to be contacted when enrolments open, with priority access and early-bird pricing.' },
              { q: 'When do the programmes start?', a: 'All three programmes launch with our inaugural cohort in June 2026. Exact start dates, schedules, and city-wise batch details will be shared with waitlist members first, typically four to six weeks before enrolment opens.' },
              { q: 'Do I have to pay anything now?', a: 'No. The waitlist is entirely free. You don\'t pay until you formally enrol, which happens later when we open registration. Pricing displayed is indicative and locked-in for waitlist members.' },
              { q: 'Can I join the waitlist for more than one programme?', a: 'Yes. Select all the programmes you\'re interested in on the form, or choose the Complete Advocate Bundle to register interest across all three at a better combined rate.' },
              { q: 'Is the waitlist first-come-first-served?', a: 'Waitlist position is recorded chronologically and members are contacted in order when enrolments open. With only 40 seats per batch, earlier signups have meaningfully better access.' },
              { q: 'Will the programmes be in-person or online?', a: 'A hybrid model. Core lectures and workshops are delivered in-person in select cities, with hybrid access available for select modules. The court visit and mock hearing components are strictly in-person. City-wise batch details will be confirmed closer to launch.' }
            ].map((item, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-q">
                  <h5>{item.q}</h5>
                  <span className="toggle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></span>
                </summary>
                <div className="faq-a">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <div className="logo">
                <img src="/logo.png" alt="Legal Olympiad" className="logo-img" />
                Legal <b>Olympiad</b>
              </div>
              <p className="tag-line">Practitioner-led professional training for India's next generation of litigators. Inaugural cohort: June 2026.</p>
            </div>
            <div>
              <h5>Programmes</h5>
              <a href="#courses">Litigation Training</a>
              <a href="#courses">Drafting &amp; Conveyancing</a>
              <a href="#courses">Judgment Appreciation</a>
              <a href="#bundle">Complete Bundle</a>
            </div>
            <div>
              <h5>Contact</h5>
              <a href="#signup">Join Waitlist</a>
              <a href="mailto:admissions@legalolympiad.in">admissions@legalolympiad.in</a>
              <a href="#">Schedule a call</a>
            </div>
          </div>
          <div className="foot-btm">
            <span>© 2026 LEGAL OLYMPIAD · ALL RIGHTS RESERVED</span>
            <span>INAUGURAL COHORT · JUNE 2026</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
