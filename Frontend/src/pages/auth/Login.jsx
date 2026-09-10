import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import api, { setSession } from '../../services/api';
import logo from '../../assets/Rtech1-logo.jpg';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !validate()) return;

    setLoading(true);
    setApiError('');

    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setSession(
        { token: data?.data?.token, user: data?.data?.user },
        remember
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
          (err?.code === 'ERR_NETWORK'
            ? 'Unable to reach the server. Please try again.'
            : 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rt-login">
      <aside className="rt-login__brand">
        <div className="rt-login__grid" />

        <div className="rt-login__brandTop">
          <div className="rt-login__logoRow">
            <img src={logo} alt="Ready Tech Solutions" className="rt-login__logo" />
            <div>
              <p className="rt-login__brandName">Ready Tech Solutions</p>
              <p className="rt-login__brandTag">Enterprise Resource Planning</p>
            </div>
          </div>
        </div>

        <div className="rt-login__brandBody">
          <h1 className="rt-login__headline">
            One platform for your <span>entire business</span>
          </h1>
          <p className="rt-login__sub">
            Manage your business operations from one powerful platform.
          </p>
          <ul className="rt-login__points">
            <li><span className="rt-login__dot" /> Sales, purchase and inventory in real time</li>
            <li><span className="rt-login__dot" /> Accounting, payroll and HR in one place</li>
            <li><span className="rt-login__dot" /> Role-based access across every branch</li>
          </ul>
        </div>

        <p className="rt-login__brandFoot">
          © {new Date().getFullYear()} Ready Tech Solutions. All rights reserved.
        </p>
      </aside>

      <main className="rt-login__panel">
        <div className="rt-login__card">
          <div className="rt-login__mobileBrand">
            <img src={logo} alt="Ready Tech Solutions" className="rt-login__logo" />
            <div>
              <p className="rt-login__brandName">Ready Tech Solutions</p>
              <p className="rt-login__brandTag">Enterprise Resource Planning</p>
            </div>
          </div>

          <h2 className="rt-login__title">Sign in to your workspace</h2>
          <p className="rt-login__hint">
            Manage your business operations from one powerful platform.
          </p>

          {apiError && (
            <div className="rt-login__alert" role="alert">
              <AlertCircle size={16} style={{ flex: 'none', marginTop: 1 }} />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="rt-login__field">
              <label className="rt-login__label" htmlFor="email">Work email</label>
              <div className="rt-login__inputWrap">
                <span className="rt-login__icon"><Mail size={17} /></span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  aria-invalid={Boolean(errors.email)}
                  className={`rt-login__input${errors.email ? ' rt-login__input--error' : ''}`}
                />
              </div>
              {errors.email && <p className="rt-login__fieldError">{errors.email}</p>}
            </div>

            <div className="rt-login__field">
              <label className="rt-login__label" htmlFor="password">Password</label>
              <div className="rt-login__inputWrap">
                <span className="rt-login__icon"><Lock size={17} /></span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  aria-invalid={Boolean(errors.password)}
                  className={`rt-login__input rt-login__input--pwd${
                    errors.password ? ' rt-login__input--error' : ''
                  }`}
                />
                <button
                  type="button"
                  className="rt-login__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="rt-login__fieldError">{errors.password}</p>}
            </div>

            <div className="rt-login__row">
              <label className="rt-login__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                Remember me
              </label>
              <a className="rt-login__link" href="/forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="rt-login__btn" disabled={loading}>
              {loading && <span className="rt-login__spinner" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="rt-login__foot">
            Secure enterprise access · Ready Tech Solutions ERP
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
