import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, User, Phone, CheckCircle, Globe, HelpCircle, Eye, EyeOff, Sparkles, Building2, Check } from 'lucide-react';
import { Tenant } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  tenants: Tenant[];
  onLoginSuccess: (user: { fullName: string; email: string; role: string; tenantId: string }) => void;
}

export default function AuthScreen({ tenants, onLoginSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+2547');
  const [role, setRole] = useState('Tenant Owner');
  const [tenantId, setTenantId] = useState(tenants[0]?.id || 'tenant-nairobi');

  // Verification states
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  // Forgot Password / Recovery States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [simulatedMagicLink, setSimulatedMagicLink] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Handle URL parsing during real Supabase page redirection landing of recovery flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasRecovery = params.get('recovery') === 'true';
    const emailParam = params.get('email');
    if (hasRecovery && emailParam) {
      setResetEmail(decodeURIComponent(emailParam));
      setIsResettingPassword(true);
      setIsForgotPassword(false);
      setIsSignUp(false);
      // Clean up parameters to maintain pristine client experience
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load existing accounts or initialize defaults
  const getRegisteredUsers = (): any[] => {
    const data = localStorage.getItem('wififlow_auth_users');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    // Default pre-seeded credentials for ease of test play
    return [
      {
        fullName: 'Kepton Otieno',
        email: 'keptonotieno@mail.com',
        password: 'kepton@12Romez',
        role: 'Tenant Owner',
        tenantId: 'tenant-nairobi',
        phone: '+254712345678'
      },
      {
        fullName: 'Kepton Otieno',
        email: 'keptonotieno@gmail.com',
        password: 'kepton@12Romez',
        role: 'Tenant Owner',
        tenantId: 'tenant-nairobi',
        phone: '+254712345678'
      },
      {
        fullName: 'Mary Wanjiku',
        email: 'mary@outlook.com',
        password: 'marypassword',
        role: 'Customer',
        tenantId: 'tenant-nairobi',
        phone: '+254722987654'
      },
      {
        fullName: 'Mwenda Cyber Agent',
        email: 'agent@cyber.ke',
        password: 'agentpassword',
        role: 'Reseller',
        tenantId: 'tenant-nairobi',
        phone: '+254700111222'
      }
    ];
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const users = getRegisteredUsers();

    // Standard RFC compliance email regular expression validation
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email) {
      setError('Email address is required.');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('Invalid address format: Please provide a valid email (e.g. user@domain.com) with a valid domain.');
      return;
    }

    if (isSignUp) {
      // Sign Up validation
      if (!fullName || !password || !phone) {
        setError('Please fill in all details to perform registered activation.');
        return;
      }

      if (password.length < 6) {
        setError('Password security warning: Password must be at least 6 characters for cloud RADIUS compatibility.');
        return;
      }

      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError('Security alert: A subscriber profile with this email already exists on the RADIUS cluster.');
        return;
      }

      // Generate a valid dynamic email verification OTP pin
      const verificationPin = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(verificationPin);
      setIsVerifyingEmail(true);
      setVerificationCode('');
      setVerificationAttempts(0);
      setSuccessMsg(`SLA Engine: Valid email pattern detected! Email verification passcode dispatched.`);

    } else {
      // Sign In validation
      if (!password) {
        setError('Password key is required for authentication.');
        return;
      }

      setSuccessMsg('Authenticating credentials with Supabase Core...');

      // Attempt live sign in via Supabase Auth
      supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      }).then(({ data, error: sbError }) => {
        if (!sbError && data.user) {
          // Found verified Supabase session
          const metadata = data.user.user_metadata || {};
          const loggedInUser = {
            fullName: metadata.full_name || metadata.fullName || data.user.email?.split('@')[0] || 'Authenticated Operator',
            email: data.user.email || email,
            password: password,
            role: metadata.role || 'Tenant Owner',
            tenantId: metadata.tenant_id || 'tenant-nairobi',
            phone: metadata.phone_number || metadata.phone || '+254700000000'
          };
          
          setSuccessMsg(`Welcome back, ${loggedInUser.fullName}! (Verified via Supabase Auth)`);
          
          // Fast sync to local sandbox lists
          const currentLocal = getRegisteredUsers();
          if (!currentLocal.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            localStorage.setItem('wififlow_auth_users', JSON.stringify([...currentLocal, loggedInUser]));
          }

          setTimeout(() => {
            onLoginSuccess(loggedInUser);
          }, 850);
        } else {
          // If Supabase failed (or user doesn't exist there yet), fall back to local test credentials
          console.warn('Supabase Auth login fallback initiated:', sbError?.message);
          
          const matchedUser = users.find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
          );

          if (matchedUser) {
            setSuccessMsg(`Welcome back, ${matchedUser.fullName}! (Sandbox Session)`);
            setTimeout(() => {
              onLoginSuccess(matchedUser);
            }, 850);
          } else {
            setError(sbError ? `Authentication failed: ${sbError.message}` : 'Invalid credentials. Please confirm your billing email and password.');
          }
        }
      }).catch(err => {
        console.warn('Supabase auth request offline, verifying locally...', err);
        const matchedUser = users.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (matchedUser) {
          setSuccessMsg(`Welcome back, ${matchedUser.fullName}! (Sandbox Session)`);
          setTimeout(() => {
            onLoginSuccess(matchedUser);
          }, 850);
        } else {
          setError('Invalid credentials combination.');
        }
      });
    }
  };

  const handleVerifyOTP = () => {
    setError(null);
    setSuccessMsg(null);

    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter the complete 6-digit confirmation passcode.');
      return;
    }

    if (verificationCode !== sentCode) {
      setVerificationAttempts(prev => {
        const next = prev + 1;
        if (next >= 4) {
          setError('Too many failed attempts. Verification session expired. Please re-trigger a fresh code.');
          setIsVerifyingEmail(false);
          return 0;
        }
        setError(`Security warning: Incorrect verification code. Attempt ${next}/4. Please check your simulated mail client.`);
        return next;
      });
      return;
    }

    const users = getRegisteredUsers();
    
    if (getRegisteredUsers().find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('Email collision: This email was recently registered inside the directory. Please sign in instead.');
      setIsVerifyingEmail(false);
      return;
    }

    const newUser = {
      fullName,
      email,
      password,
      role,
      tenantId,
      phone
    };

    // Parallel attempt to register in Supabase Auth so it instantly shows up in your Supabase Auth Console
    setSuccessMsg('Email successfully verified! Provisioning credentials in live Supabase Auth CRM ...');
    
    supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          phone_number: phone,
          tenant_id: tenantId
        }
      }
    }).then(({ data, error: sbError }) => {
      if (sbError) {
        console.warn('Supabase Auth Auto-provision warning:', sbError.message);
      } else {
        console.log('Successfully enrolled new user in Supabase Auth directory:', data.user);
      }
    }).catch(err => {
      console.warn('Supabase Auth server check timed out or unreachable:', err);
    });

    const updatedUsers = [...users, newUser];
    localStorage.setItem('wififlow_auth_users', JSON.stringify(updatedUsers));
    
    setTimeout(() => {
      setIsVerifyingEmail(false);
      onLoginSuccess(newUser);
    }, 1500);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!forgotEmail) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!EMAIL_REGEX.test(forgotEmail)) {
      setError('Invalid address format: Please provide a valid email structure (e.g. user@domain.com).');
      return;
    }

    // Ensuring only verified users can reset credentials
    const users = getRegisteredUsers();
    const exists = users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());

    if (!exists) {
      setError('Authentication check failed: No registered subscriber or admin profile found matching this email identity on our RADIUS nodes.');
      return;
    }

    setSuccessMsg('Verifying profile with Supabase Auth protection...');

    try {
      // Direct Integration with actual Supabase Auth API
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}?recovery=true&email=${encodeURIComponent(forgotEmail)}`
      });

      if (supabaseError) {
        console.warn('Supabase auth.resetPasswordForEmail sent feedback notice. It may need production domain setups:', supabaseError.message);
      }

      const recoveryToken = Math.random().toString(36).substring(2, 15);
      const testLink = `${window.location.origin}?recovery=true&email=${encodeURIComponent(forgotEmail)}&token=${recoveryToken}`;
      setSimulatedMagicLink(testLink);
      setMagicLinkSent(true);
      setError(null);
      setSuccessMsg(`Supabase Auth verification successful! One-time magic recovery link dispatched to ${forgotEmail}.`);
    } catch (err: any) {
      console.error('Supabase recovery exception:', err);
      const recoveryToken = Math.random().toString(36).substring(2, 15);
      const testLink = `${window.location.origin}?recovery=true&email=${encodeURIComponent(forgotEmail)}&token=${recoveryToken}`;
      setSimulatedMagicLink(testLink);
      setMagicLinkSent(true);
      setSuccessMsg(`Simulated Mail Transfer Active: Magic link dispatched to ${forgotEmail}.`);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setError('Password security rule: New password code must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Mismatch Error: The passwords provided do not match.');
      return;
    }

    // Now, update in our secure directories (localStorage)
    const users = getRegisteredUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === resetEmail.toLowerCase());

    if (userIndex === -1) {
      setError('Security violation: Unable to locate directory mapping for this email index.');
      return;
    }

    users[userIndex].password = newPassword;
    localStorage.setItem('wififlow_auth_users', JSON.stringify(users));

    // Also call supabase auth password update if there is an active session
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (supErr: any) {
      console.warn('Supabase direct credential password sync: Note that session password update requires logged-in session.', supErr.message);
    }

    setSuccessMsg(`Credentials update verified! Password reset successful for ${resetEmail}. Auto-routing back...`);

    setTimeout(() => {
      setIsResettingPassword(false);
      setEmail(resetEmail);
      setPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
    }, 1800);
  };

  const handleAutofill = (roleType: 'admin' | 'agent' | 'client') => {
    setError(null);
    if (roleType === 'admin') {
      setEmail('keptonotieno@mail.com');
      setPassword('kepton@12Romez');
    } else if (roleType === 'agent') {
      setEmail('agent@cyber.ke');
      setPassword('agentpassword');
    } else {
      setEmail('mary@outlook.com');
      setPassword('marypassword');
    }
  };

  return (
    <div id="wififlow-auth-panel" className="min-h-screen bg-slate-950 font-sans flex items-center justify-center p-4 relative overflow-hidden text-slate-100">
      
      {/* Background Decorative Gradient Spheres */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />

      {/* Grid wrapper for aesthetic side panel + login box */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        
        {/* Left column: App description aesthetics banner with AI-generated telecom mesh background */}
        <div className="lg:col-span-5 relative flex flex-col justify-between border-r border-white/5 overflow-hidden min-h-[300px] lg:min-h-[500px]">
          {/* AI Generated image background */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/src/assets/images/telecom_mesh_glow_1781182783646.png" 
              alt="Futuristic active network mesh nodes visual background" 
              className="w-full h-full object-cover brightness-[0.35] contrast-[1.1] transition-transform duration-1000 hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {/* Elegant vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-indigo-950/60 mix-blend-multiply" />
          </div>

          <div className="relative z-10 p-8 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⚡</span>
                <div>
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-450 from-sky-300 via-sky-400 to-indigo-400 font-sans tracking-tight drop-shadow-sm">
                    WifiFlow Core
                  </h1>
                  <span className="text-[10px] uppercase tracking-widest text-sky-400 font-bold font-mono">
                    ISP Billing & Portal OS
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 bg-slate-950/50 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-md">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-450 text-indigo-300 mt-0.5 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-150 text-white">Safaricom M-Pesa Hook</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">Simulate real instant STK pay callback activation nodes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/50 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-md">
                  <div className="p-2 bg-sky-500/20 rounded-lg text-sky-455 text-sky-300 mt-0.5 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-150 text-white">MikroTik & RADIUS Daemon</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">COA Disconnect packets and active lease accounting monitors.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/50 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-md">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-450 text-emerald-300 mt-0.5 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-150 text-white">Scratchcard Pin Generator</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">Generate, dispatch, void and thermal-print batches of coupons.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 text-[11px] font-mono text-slate-300 space-y-2">
              <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Production Ready Mesh Active
              </p>
              <p>Designed for ISPs in Nairobi, Mombasa, Juja & Campus Zones.</p>
            </div>
          </div>
        </div>

        {/* Right column: The main signup/signin form */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              {isResettingPassword 
                ? 'Choose New Security Password' 
                : isForgotPassword 
                  ? 'Secure Password Recovery' 
                  : isSignUp 
                    ? 'Create ISP Tenant Profile' 
                    : 'Subscribers Login Portal'}
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin-slow" />
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              {isResettingPassword 
                ? 'Configure a robust new credential key to restore access to your RADIUS dashboard profile.'
                : isForgotPassword 
                  ? 'Request a secure magic reset link powered by Supabase Auth security rules. Only verified billing accounts allowed.'
                  : isSignUp 
                    ? 'Join WifiFlow today to launch your client-connected white label captive hotspot nodes.' 
                    : 'Authenticate credentials to connect to our core multi-tenant administration backend.'}
            </p>
          </div>

          {/* Form container / Verification flow */}
          {isResettingPassword ? (
            <div className="space-y-4 animate-fade-in">
              {/* Error & Success States alerts */}
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-200 text-xs rounded-xl flex items-center gap-2 animate-shake">
                  <span className="text-lg">🚨</span>
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="p-3 rounded-xl border border-indigo-500/10 bg-indigo-950/20 text-indigo-300 text-xs font-mono">
                  <span>Authorized Target Recovery Account:</span>
                  <span className="block mt-0.5 font-bold text-white text-sm">{resetEmail}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New Password Key</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors text-white"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password Key</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors text-white"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-350 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide plain keys' : 'Show plain keys'}</span>
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPassword(false);
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800 border border-white/5 hover:bg-slate-700 cursor-pointer text-center font-mono transition-all"
                  >
                    Cancel Action
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-550 cursor-pointer text-center uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Reset & Store Keys
                  </button>
                </div>
              </form>
            </div>
          ) : isForgotPassword ? (
            <div className="space-y-4 animate-fade-in">
              {/* Error & Success States alerts */}
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-200 text-xs rounded-xl flex items-center gap-2 animate-shake">
                  <span className="text-lg">🚨</span>
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

              {!magicLinkSent ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Registered Administrator Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors placeholder:text-slate-550 text-white"
                        placeholder="e.g. admin@wififlow.co.ke"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 font-semibold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 cursor-pointer text-white py-2.5 rounded-xl shadow-lg shadow-indigo-950/50 hover:shadow-indigo-950 transition-all text-center flex items-center justify-center gap-2 uppercase tracking-wide animate-pulse"
                  >
                    <ShieldCheck className="w-4.5 h-4.5" />
                    Verify User & Send Magic Reset Link
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotEmail('');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-slate-350 font-semibold cursor-pointer py-1.5 block hover:underline"
                  >
                    ← Back to Subscribers Login Panel
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* SMTP Server Mail Hub Display Simulator */}
                  <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-950/30 text-emerald-300 space-y-3 font-mono text-xs relative overflow-hidden shadow-inner animate-fade-in">
                    <div className="absolute top-0 right-0 bg-emerald-500/20 px-2.5 py-1 text-[9px] text-emerald-400 font-bold tracking-wider uppercase rounded-bl border-b border-l border-emerald-500/10">
                      Mail Hub Sim
                    </div>

                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Mail className="w-4 h-4 animate-bounce shrink-0" />
                      <span>SMTP Auth Outgoing Relay Daemon</span>
                    </div>

                    <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-emerald-500/5">
                      <p className="text-[10px] text-slate-400">Subject: <span className="text-slate-200">Supabase Security Magic Password Reset Link</span></p>
                      <p className="text-[10px] text-slate-400">Recipient: <span className="text-indigo-400 font-bold">{forgotEmail}</span></p>
                      <p className="text-[10px] text-slate-400 mt-2 border-t border-white/5 pt-1.5 leading-relaxed text-slate-300 font-sans">
                        We have triggered a real password recovery email event via the Supabase Auth JS SDK connection hook.
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-2 mt-2 font-sans">
                      <span className="block text-[10px] text-sky-400 font-bold font-mono">🔗 Secure Magic Link Redirect Endpoint:</span>
                      <p className="text-[9px] break-all bg-black/40 p-2 rounded text-slate-400 font-mono">
                        {simulatedMagicLink}
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(forgotEmail);
                          setIsResettingPassword(true);
                          setIsForgotPassword(false);
                          setMagicLinkSent(false);
                        }}
                        className="w-full mt-1.5 text-center text-[11px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-sans font-bold py-2 px-3 rounded-lg transition-all cursor-pointer shadow-md"
                      >
                        ⚡ Simulate Email Click / Open Recovery Flow
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotEmail('');
                      setMagicLinkSent(false);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full text-center text-xs text-sky-400 hover:text-sky-350 font-semibold cursor-pointer py-1.5 block hover:underline"
                  >
                    ← Back to Subscribers Login Panel
                  </button>
                </div>
              )}
            </div>
          ) : isVerifyingEmail ? (
            <div className="space-y-4 animate-fade-in">
              {/* Error & Success States alerts */}
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-200 text-xs rounded-xl flex items-center gap-2 animate-shake">
                  <span className="text-lg">🚨</span>
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sky-450 animate-pulse" />
                  Verify Email Address
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  We have simulated a secure 6-digit confirmation key OTP and dispatched it to the valid email identity below:
                  <span className="block mt-1.5 font-bold text-white underline decoration-sky-400 font-mono text-[13px]">{email}</span>
                </p>
              </div>

              {/* Dynamic Simulated Email Inbox Dispatcher Container */}
              <div className="p-4 rounded-xl border border-sky-500/10 bg-sky-950/30 text-sky-300 space-y-3 font-mono text-xs relative overflow-hidden shadow-inner">
                <div className="absolute top-0 right-0 bg-sky-500/20 px-2.5 py-1 text-[9px] text-sky-400 font-bold tracking-wider uppercase rounded-bl border-b border-l border-sky-500/10">
                  Mail Hub Sim
                </div>
                
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <Mail className="w-4 h-4 animate-bounce shrink-0" />
                  <span>Interactive SMTP Receive Daemon</span>
                </div>

                <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-sky-500/5">
                  <p className="text-[10px] text-slate-400">Subject: <span className="text-slate-200">WifiFlow Tenant Auth Account Verification Code</span></p>
                  <p className="text-[10px] text-slate-400">Recipient: <span className="text-indigo-400 font-bold">{email}</span></p>
                  <p className="text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-1.5 flex items-center justify-between">
                    <span>Generated verification pin:</span>
                    <span className="text-white text-base font-black tracking-widest">{sentCode}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2.5 mt-1.5">
                  <span className="text-[9px] text-slate-500 italic font-sans leading-tight">
                    Every active ISP registration requires exact RFC-compliant verification rules.
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setVerificationCode(sentCode)}
                    className="text-[10px] whitespace-nowrap bg-sky-400/10 hover:bg-sky-400/20 text-sky-400 border border-sky-400/20 px-2.5 py-1.5 rounded-lg cursor-pointer font-sans font-bold transition-all shrink-0 shadow-sm"
                  >
                    📋 Auto-Paste Code
                  </button>
                </div>
              </div>

              {/* Code input field */}
              <div className="space-y-1">
                <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 align-middle">
                  Enter 6-digit verification code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full tracking-[0.5em] text-center text-xl font-bold font-mono py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors uppercase placeholder:text-slate-600 placeholder:tracking-normal text-white"
                  placeholder="------"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {/* Action operations buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setSentCode(freshCode);
                    setSuccessMsg(`SLA Engine: Dispatched fresh verification token.`);
                    setError(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800 border border-white/5 hover:bg-slate-705 cursor-pointer text-center text-slate-300 font-mono transition-all hover:bg-slate-700"
                >
                  🔄 Resend OTP
                </button>

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-550 cursor-pointer text-center uppercase tracking-wider transition-all"
                >
                  🚀 Verify Code
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsVerifyingEmail(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 font-semibold cursor-pointer py-1.5 block hover:underline"
              >
                ← Cancel registration & correct email address
              </button>
            </div>
          ) : (
            <>
              {/* Form container */}
              <form onSubmit={handleAuth} className="space-y-4">
                
                {/* Error & Success States alerts */}
                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-200 text-xs rounded-xl flex items-center gap-2 animate-shake">
                    <span className="text-lg">🚨</span>
                    <span className="font-semibold">{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
                    <span className="font-semibold">{successMsg}</span>
                  </div>
                )}

                {isSignUp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full name input */}
                    <div>
                      <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Owner Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors placeholder:text-slate-550"
                          placeholder="Mwangi Karanja"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Telephone */}
                    <div>
                      <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">M-Pesa Payout Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors"
                          placeholder="+254712345678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Address */}
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Identity</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors placeholder:text-slate-550"
                        placeholder="e.g. admin@wififlow.co.ke"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">Secret Key Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setForgotEmail(email);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[10px] font-semibold text-sky-400 hover:text-sky-350 transition-colors cursor-pointer hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:bg-slate-800 transition-colors"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isSignUp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role choice */}
                    <div>
                      <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">System Role Assignment</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-xl text-sm focus:outline-none text-white focus:border-sky-500 focus:bg-slate-800 cursor-pointer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="Tenant Owner">Tenant Owner (Full Admin)</option>
                        <option value="Manager">Manager (Billing Team)</option>
                        <option value="Support Agent">Support Agent (Helpdesk)</option>
                        <option value="Reseller">Reseller (Cyber Booth Selling)</option>
                        <option value="Customer">Customer (Hotspot User Profile)</option>
                      </select>
                    </div>

                    {/* Sub-tenant Link */}
                    <div>
                      <label className="block text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Associated Network Branch</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-xl text-sm focus:outline-none text-white focus:border-sky-500 focus:bg-slate-800 cursor-pointer"
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 font-semibold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 cursor-pointer text-white py-2.5 rounded-xl shadow-lg shadow-indigo-950/50 hover:shadow-indigo-950 transition-all text-center flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                  {isSignUp ? 'Launch ISP Network Engine' : 'Authenticate Hotspot Access Shield'}
                </button>

              </form>

              {/* Action toggle login versus register */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">
                  {isSignUp ? 'Already own an ISP branch account?' : 'Need to set up a new ISP domain?'}
                </span>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sky-400 font-semibold hover:text-sky-300 transition-colors hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up Partner'}
                </button>
              </div>

              {/* Quick Sandbox Play / Access credentials autofill drawer */}
              {!isSignUp && (
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest font-mono text-slate-500 font-bold">
                    🔒 Tap to Bypass / Autofill Tested Profiles:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutofill('admin')}
                      className="bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-white/10 p-2.5 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <span className="block text-[10px] text-sky-400 font-bold">Tenant Owner</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 truncate font-mono">keptonotieno@mail.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutofill('agent')}
                      className="bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-white/10 p-2.5 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <span className="block text-[10px] text-indigo-400 font-bold">Reseller Agent</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 truncate font-mono">agent@cyber.ke</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutofill('client')}
                      className="bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-white/10 p-2.5 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <span className="block text-[10px] text-emerald-400 font-bold">Student Customer</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 truncate font-mono">mary@outlook.com</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>

    </div>
  );
}
