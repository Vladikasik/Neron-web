import React from 'react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="w-full h-screen bg-black text-white overflow-y-auto">
      <div className="min-h-full p-8">
        <div className="max-w-4xl mx-auto pb-16">
          {/* Navigation Header */}
          <div className="mb-8">
            <a 
              href="/" 
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors font-mono text-sm uppercase tracking-wide"
            >
              ← BACK TO NERON
            </a>
          </div>
          
          <div className="border border-white/20 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 bg-white"></div>
              <h1 className="text-2xl font-mono uppercase tracking-wide">TERMS OF SERVICE</h1>
            </div>
            
            <div className="space-y-8 font-mono text-sm leading-relaxed">
              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">1. ACCEPTANCE OF TERMS</h2>
                <p className="text-white/70">
                  By accessing and using NERON (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">2. SERVICE DESCRIPTION</h2>
                <p className="text-white/70 mb-4">
                  NERON provides a knowledge graph visualization platform with authentication services including:
                </p>
                <ul className="list-none space-y-2 text-white/70 ml-4">
                  <li>• GitHub OAuth authentication</li>
                  <li>• Twitter OAuth authentication</li>
                  <li>• Solana Web3 wallet integration</li>
                  <li>• Interactive graph visualization</li>
                  <li>• Data analysis and management tools</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">3. USER ACCOUNTS</h2>
                <p className="text-white/70">
                  You are responsible for safeguarding the password and for keeping your account information current. 
                  You agree not to disclose your password to any third party and to take sole responsibility for 
                  activities that occur under your account.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">4. ACCEPTABLE USE</h2>
                <p className="text-white/70 mb-4">You agree not to use the Service to:</p>
                <ul className="list-none space-y-2 text-white/70 ml-4">
                  <li>• Violate any applicable laws or regulations</li>
                  <li>• Transmit malicious code or harmful content</li>
                  <li>• Attempt to gain unauthorized access to systems</li>
                  <li>• Interfere with or disrupt the service</li>
                  <li>• Use automated systems to access the service without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">5. PRIVACY POLICY</h2>
                <p className="text-white/70">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
                  to understand our practices regarding the collection and use of your information.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">6. INTELLECTUAL PROPERTY</h2>
                <p className="text-white/70">
                  The Service and its original content, features, and functionality are and will remain the exclusive property 
                  of NERON and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">7. LIMITATION OF LIABILITY</h2>
                <p className="text-white/70">
                  In no event shall NERON, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">8. TERMINATION</h2>
                <p className="text-white/70">
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason 
                  whatsoever, including without limitation if you breach the Terms.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">9. CHANGES TO TERMS</h2>
                <p className="text-white/70">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                  If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              <section>
                <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">10. CONTACT INFORMATION</h2>
                <p className="text-white/70">
                  If you have any questions about these Terms of Service, please contact us at: 
                  <span className="text-white ml-2">legal@neron.guru</span>
                </p>
              </section>

              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-white/50 text-xs">
                  LAST UPDATED: {new Date().toLocaleDateString('EN-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 