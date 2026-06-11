import React, { useState } from 'react';
import { Globe, Palette, Languages, Settings, Smartphone, CheckCircle, Wifi, Landmark, ShieldCheck, Heart } from 'lucide-react';
import { Tenant, InternetPackage } from '../types';

interface CaptivePortalSimProps {
  tenant: Tenant;
  packages: InternetPackage[];
  onCompletePortalActivation: (fullName: string, phone: string, amount: number) => void;
}

export default function CaptivePortalSim({
  tenant,
  packages,
  onCompletePortalActivation
}: CaptivePortalSimProps) {

  // RLS Isolation: packages linked to inactive tenants are hidden
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // Design config state
  const [lang, setLang] = useState<'EN' | 'SW'>('EN');
  const [welcomeText, setWelcomeText] = useState(
    tenant.id === 'tenant-nairobi' 
      ? 'High-speed Fiber Broadband Hotspot' 
      : 'Connect and Browse JKUAT Student Wifi'
  );
  
  const [colorPreset, setColorPreset] = useState<string>(tenant.primaryColor);

  // Captive Portal routing page state
  const [activePortalPage, setActivePortalPage] = useState<'LOGIN' | 'REGISTER' | 'BUY_PACKAGE' | 'VOUCHER_LOGIN' | 'PAYMENT' | 'SUCCESS'>('LOGIN');

  // Input states inside simulator
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('2547');
  const [selectedPkg, setSelectedPkg] = useState<InternetPackage | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [activationCountdown, setActivationCountdown] = useState(5);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Dictionary translations (English vs Swahili)
  const dict = {
    EN: {
      selectPlan: 'Select Internet Package',
      voucherLogin: 'Login with Voucher',
      buyPackage: 'Buy Package (M-Pesa)',
      register: 'Register & Browse',
      enterVoucher: 'Enter Voucher Code',
      verify: 'Validate & Browse',
      username: 'Your Name',
      phone: 'M-Pesa Phone Number',
      submitReg: 'Proceed to Payment',
      successHeader: 'Internet Activated Successfully!',
      successDesc: 'Your connection has been launched on the core router. Target speed: ',
      remainingTime: 'Uptime activated. Speed profile loaded in < 5 seconds.',
      connectBtn: 'Start Browsing Now',
      backToLogin: 'Back to Login Portal',
      payInstructions: 'M-Pesa STK push has been sent. Enter your PIN to complete KES ',
      verifying: 'Verifying payment callback ledger...',
    },
    SW: {
      selectPlan: 'Chagua Kifurushi cha Mtandao',
      voucherLogin: 'Ingia kwa Kutumia Vocha',
      buyPackage: 'Nunua Kifurushi (M-Pesa)',
      register: 'Jisajili na Uvinjari',
      enterVoucher: 'Weka Nambari ya Vocha',
      verify: 'Thibitisha na Uvinjari',
      username: 'Jina Lako',
      phone: 'Nambari ya Simu ya M-Pesa',
      submitReg: 'Endelea Lipa M-Pesa',
      successHeader: 'Mtandao Umewashwa Kikamilifu!',
      successDesc: 'Uunganisho wako umewezeshwa kwenye router kuu. Kasi ya mtandao: ',
      remainingTime: 'Kifurushi kiko tayari. Kasi imerekeshwa kwa chini ya sekunde 5.',
      connectBtn: 'Anza Kuvinjari Sasa',
      backToLogin: 'Rudi kwenye Ukurasa Mkuu',
      payInstructions: 'STK push imetumwa kwa simu yako. Weka PIN kukamilisha KES ',
      verifying: 'Tunathibitisha malipo kwenye mfumo...',
    }
  }[lang];

  // Simulating payment push
  const handleTriggerMpesaPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !customerPhone || simulatingPayment) return;

    setSimulatingPayment(true);
    setActivationCountdown(4);

    let current = 4;
    const interval = setInterval(() => {
      current -= 1;
      setActivationCountdown(current);
      if (current <= 0) {
        clearInterval(interval);
        setSimulatingPayment(false);
        onCompletePortalActivation(customerName || 'Captive Portal Client', customerPhone, selectedPkg.price);
        setActivePortalPage('SUCCESS');
      }
    }, 1000);
  };

  // Simulating voucher code validate
  const handleVerifyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;

    setSimulatingPayment(true);
    setTimeout(() => {
      setSimulatingPayment(false);
      onCompletePortalActivation('Voucher Guest User', '2547000000', 50);
      setActivePortalPage('SUCCESS');
    }, 1500);
  };

  return (
    <div id="captive-portal-panel" className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-slate-700" />
            White-Label Captive Portal Designer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Design and preview responsive customer splash login pages. Integrates live language translations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
        
        {/* Left customization panel */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Settings className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-800 text-sm">Theme Settings</span>
          </div>

          {/* Color preset select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">Colors Accent preset</label>
            <div className="flex gap-2">
              {['#0284c7', '#16a34a', '#ea580c', '#e11d48', '#4f46e5'].map(color => (
                <button
                  key={color}
                  onClick={() => setColorPreset(color)}
                  className="w-7 h-7 rounded-full border border-slate-200 transition-transform cursor-pointer hover:scale-110 flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: color }}
                >
                  {colorPreset === color && '✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Lang Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">System Language Mode</label>
            <div className="flex gap-1.5 bg-slate-50 border border-slate-150 rounded-lg p-1 w-fit">
              <button
                type="button"
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${lang === 'EN' ? 'bg-white text-slate-8c0 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setLang('EN')}
              >
                English
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${lang === 'SW' ? 'bg-white text-slate-8c5 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setLang('SW')}
              >
                Kiswahili
              </button>
            </div>
          </div>

          {/* Custom welcome text input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">SaaS Splash Page Welcome subtitle</label>
            <textarea
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 max-w-full focus:bg-white"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              rows={2}
            />
          </div>

          <div className="border-t border-slate-50 pt-3 flex flex-wrap gap-1">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">Jump Preview Frame to page:</span>
            <div className="grid grid-cols-3 gap-1 w-full mt-1.5">
              {(['LOGIN', 'REGISTER', 'BUY_PACKAGE', 'VOUCHER_LOGIN', 'PAYMENT', 'SUCCESS'] as const).map(pg => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => {
                    setActivePortalPage(pg);
                    if (pg === 'SUCCESS' && !selectedPkg) {
                      setSelectedPkg(tenantPackages[0]);
                    }
                  }}
                  className={`text-[9px] font-semibold py-1 rounded transition-colors ${
                    activePortalPage === pg 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-150'
                  }`}
                >
                  {pg.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right preview frame: Simulated Mobile Phone viewport */}
        <div className="lg:col-span-8 flex justify-center bg-slate-100/50 rounded-xl p-5 border border-dashed border-slate-250 items-center">
          
          <div className="w-[340px] h-[600px] border-8 border-slate-900 rounded-[30px] bg-slate-50 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Speaker & notch */}
            <div className="w-32 h-5 bg-slate-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
              <span className="w-8 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Simulated Live Frame Screen Page Container */}
            <div className="flex-1 overflow-y-auto px-5 py-8 pt-10 flex flex-col justify-between">
              
              {/* Header section (Dynamic colors & custom welcome text based on selections) */}
              <div className="text-center space-y-2 mt-4">
                <span className="text-3xl block" id="portal-brand-logo-preview">
                  {tenant.logo}
                </span>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {tenant.name}
                </h2>
                <p className="text-xs text-slate-500 font-sans px-2 leading-snug">
                  {welcomeText}
                </p>
              </div>

              {/* Dynamic Pages */}
              <div className="my-6">
                
                {activePortalPage === 'LOGIN' && (
                  <div className="space-y-3.5">
                    <button
                      onClick={() => setActivePortalPage('VOUCHER_LOGIN')}
                      className="w-full text-xs font-semibold py-2 px-3 rounded-lg text-white font-sans text-center cursor-pointer transition-colors shadow-sm"
                      style={{ backgroundColor: colorPreset }}
                    >
                      {dict.voucherLogin}
                    </button>
                    
                    <button
                      onClick={() => setActivePortalPage('REGISTER')}
                      className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-white border text-slate-700 hover:bg-slate-50 text-center cursor-pointer font-sans"
                      style={{ borderColor: colorPreset }}
                    >
                      {dict.buyPackage}
                    </button>
                  </div>
                )}

                {activePortalPage === 'REGISTER' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5">{dict.register}</h4>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-slate-400 block">{dict.username}</label>
                        <input
                          type="text"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          placeholder="Joseph Onyango"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-slate-400 block">{dict.phone}</label>
                        <input
                          type="text"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          placeholder="254712345678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActivePortalPage('BUY_PACKAGE')}
                      className="w-full text-xs font-semibold py-2 rounded-lg text-white"
                      style={{ backgroundColor: colorPreset }}
                    >
                      Choose Package Offer
                    </button>
                  </div>
                )}

                {activePortalPage === 'BUY_PACKAGE' && (
                  <div className="space-y-3.5 text-xs text-slate-700">
                    <h4 className="font-sans font-bold text-slate-800 text-xs border-b border-gray-100 pb-1.5">
                      {dict.selectPlan}
                    </h4>
                    
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {tenantPackages.map(pkg => (
                        <div 
                          key={pkg.id}
                          onClick={() => setSelectedPkg(pkg)}
                          className={`p-2.5 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                            selectedPkg?.id === pkg.id 
                              ? 'border-indigo-600 bg-indigo-50/50' 
                              : 'border-slate-150 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="block font-bold text-slate-900">{pkg.name}</span>
                            <span className="text-[10px] text-slate-500">Speed up to {pkg.downloadSpeed} • {pkg.deviceLimit} Devices</span>
                          </div>
                          <span className="font-bold text-slate-900 text-xs font-mono">
                            KES {pkg.price}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        if (selectedPkg) setActivePortalPage('PAYMENT');
                        else alert('Please tap a package option first');
                      }}
                      className="w-full text-xs font-bold py-2 rounded-lg text-white mt-2 transition-colors"
                      style={{ backgroundColor: colorPreset }}
                    >
                      {dict.submitReg}
                    </button>
                  </div>
                )}

                {activePortalPage === 'VOUCHER_LOGIN' && (
                  <form onSubmit={handleVerifyVoucher} className="space-y-3.5">
                    <h4 className="text-xs font-bold font-sans text-slate-800 border-b border-gray-100 pb-1.5">{dict.enterVoucher}</h4>
                    <input
                      type="text"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 text-center uppercase font-mono font-bold font-semibold focus:outline-none"
                      placeholder="e.g. WF3305Y"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                    />

                    <button
                      type="submit"
                      disabled={simulatingPayment}
                      className="w-full text-xs font-bold py-2 rounded-lg text-white transition-all"
                      style={{ backgroundColor: colorPreset }}
                    >
                      {simulatingPayment ? 'Validating on AP...' : dict.verify}
                    </button>
                  </form>
                )}

                {activePortalPage === 'PAYMENT' && selectedPkg && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <Landmark className="w-4 h-4" /> M-Pesa Hook Trigger
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {dict.payInstructions} <strong>{selectedPkg.price}</strong>.
                    </p>

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-800 font-mono space-y-1">
                      <div><strong>Shortcode:</strong> {tenant.id === 'tenant-nairobi' ? '174379' : '304955'}</div>
                      <div><strong>Client Phone:</strong> {customerPhone}</div>
                      <div><strong>Amount KES:</strong> {selectedPkg.price}</div>
                    </div>

                    <button
                      onClick={handleTriggerMpesaPush}
                      disabled={simulatingPayment}
                      className="w-full text-xs font-bold py-2 rounded-lg text-white transition-all flex items-center justify-center gap-1"
                      style={{ backgroundColor: colorPreset }}
                    >
                      {simulatingPayment ? (
                        <>
                          <span className="animate-spin">🌀</span> {dict.verifying} ({activationCountdown}s)
                        </>
                      ) : (
                        'Tap to Simulate Phone Pin Dialed'
                      )}
                    </button>
                  </div>
                )}

                {activePortalPage === 'SUCCESS' && selectedPkg && (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-650">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-md font-bold text-slate-850 leading-snug">{dict.successHeader}</h3>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        {dict.successDesc} <strong>{selectedPkg.downloadSpeed} Speed</strong>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/50 text-xs font-mono text-slate-700 italic">
                      {dict.remainingTime}
                    </div>

                    <button
                      onClick={() => setActivePortalPage('LOGIN')}
                      className="w-full text-xs font-semibold py-2 rounded-lg text-slate-700 bg-white border hover:bg-slate-50 mt-4 cursor-pointer"
                    >
                      {dict.backToLogin}
                    </button>
                  </div>
                )}

              </div>

              {/* Splash portal footer details */}
              <div className="text-[10px] text-slate-400 text-center border-t border-slate-50 pt-3">
                <span>Secure connection • Supported by Safaricom & MikroTik AP</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
