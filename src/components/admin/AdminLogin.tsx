import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { Lock, ArrowRight, Eye, EyeOff, ArrowLeft, ShieldCheck, Mail, AlertCircle, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, setCurrentView, siteContent } = useProjects();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password. Access denied.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafaf5] dark:bg-[#151715] text-[#1a1c19] dark:text-[#f1f1ec] transition-colors">
      <div className="w-full max-w-md bg-[#f4f4ef] dark:bg-[#1c1f1c] p-8 sm:p-10 rounded-3xl border border-[#eeeee9] dark:border-[#2a302a] shadow-xl flex flex-col gap-6 relative">
        {/* Top Back Link */}
        <button
          onClick={() => setCurrentView('portfolio')}
          className="self-start text-xs font-semibold text-[#414844] dark:text-[#b9c1ba] hover:text-[#2d5342] dark:hover:text-[#528c70] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portfolio</span>
        </button>

        {/* Lock Icon & Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-[#2d5342]/10 dark:bg-[#528c70]/20 text-[#2d5342] dark:text-[#528c70] flex items-center justify-center mb-1">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1a1c19] dark:text-[#f1f1ec]">
            Creator Studio Auth
          </h2>
          <p className="text-xs text-[#414844] dark:text-[#b9c1ba]">
            Supabase Authenticated Admin Access for {siteContent.brandName}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1a1c19] dark:text-[#f1f1ec]">
              Admin Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="admin@example.com"
                className="w-full bg-[#fafaf5] dark:bg-[#151715] pl-10 pr-4 py-3 rounded-xl text-sm text-[#1a1c19] dark:text-[#f1f1ec] border border-[#eeeee9] dark:border-[#2a302a] focus:outline-none focus:ring-2 focus:ring-[#2d5342] transition-all"
              />
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#414844] dark:text-[#b9c1ba]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1a1c19] dark:text-[#f1f1ec]">
              Supabase Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter admin password..."
                className="w-full bg-[#fafaf5] dark:bg-[#151715] pl-4 pr-11 py-3 rounded-xl text-sm text-[#1a1c19] dark:text-[#f1f1ec] border border-[#eeeee9] dark:border-[#2a302a] focus:outline-none focus:ring-2 focus:ring-[#2d5342] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#414844] dark:text-[#b9c1ba] hover:text-[#1a1c19] dark:hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#2d5342] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#456b59] transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Supabase...</span>
              </>
            ) : (
              <>
                <span>Log In with Supabase Auth</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#eeeee9] dark:border-[#2a302a] text-[11px] text-[#414844] dark:text-[#b9c1ba]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2d5342] dark:text-[#528c70]" />
          <span>Protected Supabase Auth Session</span>
        </div>
      </div>
    </div>
  );
};
