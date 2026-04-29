import React, { useState } from 'react';
import { X, CheckCircle2, Rocket, Users, ShieldCheck, Zap, ArrowRight, CreditCard, Building2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onUpgrade: (teamName: string) => Promise<void>;
}

export function UpgradeModal({ onClose, onUpgrade }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [teamName, setTeamName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isUpgrading, setIsUpgradeing] = useState(false);

  const benefits = [
    {
      icon: Users,
      title: 'Team Collaboration',
      desc: 'Invite your team members and assign roles like PM, Developer, or Client.',
      color: 'text-blue-400'
    },
    {
      icon: Zap,
      title: 'Centralized Database',
      desc: 'Sync all your projects and data with Supabase for real-time access across devices.',
      color: 'text-amber-400'
    },
    {
      icon: ShieldCheck,
      title: 'Role-Based Access',
      desc: 'Granular permissions to control who can view or edit specific project sheets.',
      color: 'text-emerald-400'
    },
    {
      icon: Rocket,
      title: 'Advanced Analytics',
      desc: 'Get deep insights into task progress, team performance, and project timelines.',
      color: 'text-rose-400'
    }
  ];

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount !== '29') return;
    setIsUpgradeing(true);
    try {
      await onUpgrade(teamName);
    } catch (err) {
      console.error(err);
      setIsUpgradeing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="relative p-8">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {step === 1 ? (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 mb-4">
                  <Rocket className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Team Plan</h2>
                <p className="text-gray-400">Unlock the full power of CyberConnect for your organization.</p>
              </div>

              <div className="space-y-6 mb-10">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className={`mt-1 p-2 rounded-lg bg-surface-800 border border-surface-700 ${benefit.color}`}>
                      <benefit.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        {benefit.title}
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Get Started — $29/month
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 mb-4">
                  <Building2 className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Team Setup</h2>
                <p className="text-gray-400">Tell us about your organization.</p>
              </div>

              <form onSubmit={handleProceed} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Team Name</label>
                  <input
                    required
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 text-brand-400">Mock Payment (Type "29" to confirm)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      required
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="Enter 29"
                      className="w-full bg-surface-800 border border-brand-500/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isUpgrading || paymentAmount !== '29' || !teamName.trim()}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
                >
                  {isUpgrading ? 'Processing...' : 'Complete Upgrade'}
                </button>
                
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-gray-500 hover:text-gray-400 font-medium transition-colors"
                >
                  Back to benefits
                </button>
              </form>
            </div>
          )}
          
          <p className="text-center text-xs text-gray-600 mt-6">
            CyberConnect Secure Billing • Terms of Service Apply
          </p>
        </div>
      </div>
    </div>
  );
}
