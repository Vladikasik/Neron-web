import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-mono uppercase tracking-wide">PRIVACY POLICY</h1>
          </div>
          
          <div className="space-y-8 font-mono text-sm leading-relaxed">
            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">1. INFORMATION WE COLLECT</h2>
              <div className="space-y-4 text-white/70">
                <div>
                  <h3 className="text-white/80 uppercase text-sm mb-2">Authentication Data</h3>
                  <p>When you authenticate with our service, we collect:</p>
                  <ul className="list-none space-y-1 ml-4 mt-2">
                    <li>• GitHub account information (username, email, public profile)</li>
                    <li>• Twitter account information (username, public profile)</li>
                    <li>• Solana wallet addresses and public keys</li>
                    <li>• Session tokens and authentication timestamps</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white/80 uppercase text-sm mb-2">Usage Data</h3>
                  <p>We automatically collect information about how you use our service:</p>
                  <ul className="list-none space-y-1 ml-4 mt-2">
                    <li>• Graph interaction patterns and navigation behavior</li>
                    <li>• Device information (browser type, operating system)</li>
                    <li>• IP addresses and geographical location (city/country level)</li>
                    <li>• Log files containing timestamps and actions performed</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">2. HOW WE USE YOUR INFORMATION</h2>
              <p className="text-white/70 mb-4">We use collected information for the following purposes:</p>
              <ul className="list-none space-y-2 text-white/70 ml-4">
                <li>• Providing and maintaining the NERON service</li>
                <li>• Authenticating users and managing access control</li>
                <li>• Personalizing your experience with the graph visualization</li>
                <li>• Improving our service through usage analytics</li>
                <li>• Detecting and preventing security threats</li>
                <li>• Communicating service updates and important notices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">3. DATA STORAGE AND SECURITY</h2>
              <div className="space-y-4 text-white/70">
                <div>
                  <h3 className="text-white/80 uppercase text-sm mb-2">Storage Infrastructure</h3>
                  <p>Your data is stored using Supabase's secure cloud infrastructure with:</p>
                  <ul className="list-none space-y-1 ml-4 mt-2">
                    <li>• End-to-end encryption for data in transit and at rest</li>
                    <li>• Regular automated backups and disaster recovery</li>
                    <li>• SOC 2 Type II compliant data centers</li>
                    <li>• Row-level security policies to protect user data</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white/80 uppercase text-sm mb-2">Access Controls</h3>
                  <p>We implement strict access controls including:</p>
                  <ul className="list-none space-y-1 ml-4 mt-2">
                    <li>• Multi-factor authentication for administrative access</li>
                    <li>• Principle of least privilege for data access</li>
                    <li>• Regular security audits and vulnerability assessments</li>
                    <li>• Encrypted API communications using HTTPS/TLS</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">4. THIRD-PARTY SERVICES</h2>
              <p className="text-white/70 mb-4">We integrate with the following third-party services:</p>
              <div className="space-y-4 text-white/70">
                <div>
                  <h3 className="text-white/80 uppercase text-sm">• GitHub OAuth</h3>
                  <p className="text-xs text-white/60 ml-4">Subject to GitHub's Privacy Policy</p>
                </div>
                <div>
                  <h3 className="text-white/80 uppercase text-sm">• Twitter/X OAuth</h3>
                  <p className="text-xs text-white/60 ml-4">Subject to X's Privacy Policy</p>
                </div>
                <div>
                  <h3 className="text-white/80 uppercase text-sm">• Solana Web3 Wallets</h3>
                  <p className="text-xs text-white/60 ml-4">Subject to individual wallet provider policies</p>
                </div>
                <div>
                  <h3 className="text-white/80 uppercase text-sm">• Supabase</h3>
                  <p className="text-xs text-white/60 ml-4">Subject to Supabase's Privacy Policy</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">5. DATA SHARING</h2>
              <p className="text-white/70 mb-4">We do not sell, trade, or rent your personal information. We may share data only in these circumstances:</p>
              <ul className="list-none space-y-2 text-white/70 ml-4">
                <li>• With your explicit consent for specific purposes</li>
                <li>• To comply with legal obligations or court orders</li>
                <li>• To protect the rights, property, or safety of NERON or users</li>
                <li>• In case of business transfer (merger, acquisition, etc.)</li>
                <li>• With service providers under strict confidentiality agreements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">6. YOUR RIGHTS</h2>
              <p className="text-white/70 mb-4">You have the following rights regarding your personal data:</p>
              <ul className="list-none space-y-2 text-white/70 ml-4">
                <li>• <span className="text-white/80">Access:</span> Request a copy of your personal data</li>
                <li>• <span className="text-white/80">Rectification:</span> Request correction of inaccurate data</li>
                <li>• <span className="text-white/80">Erasure:</span> Request deletion of your personal data</li>
                <li>• <span className="text-white/80">Portability:</span> Request transfer of your data</li>
                <li>• <span className="text-white/80">Objection:</span> Object to processing of your data</li>
                <li>• <span className="text-white/80">Restriction:</span> Request restriction of data processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">7. DATA RETENTION</h2>
              <p className="text-white/70">
                We retain your personal data only for as long as necessary to provide our services and comply with legal obligations. 
                Authentication data is retained for the duration of your account. Usage data is typically retained for 12 months 
                for analytics purposes. You may request deletion of your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">8. COOKIES AND TRACKING</h2>
              <p className="text-white/70 mb-4">We use the following types of cookies and tracking technologies:</p>
              <ul className="list-none space-y-2 text-white/70 ml-4">
                <li>• <span className="text-white/80">Essential Cookies:</span> Required for authentication and basic functionality</li>
                <li>• <span className="text-white/80">Analytics Cookies:</span> Help us understand how you use our service</li>
                <li>• <span className="text-white/80">Session Storage:</span> Temporary storage for your current session</li>
                <li>• <span className="text-white/80">Local Storage:</span> Persistent storage for user preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">9. CHILDREN'S PRIVACY</h2>
              <p className="text-white/70">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information 
                from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">10. CHANGES TO THIS POLICY</h2>
              <p className="text-white/70">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                Privacy Policy on this page and updating the "Last Updated" date. Significant changes will be communicated 
                via email or prominent notice within the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg uppercase tracking-wide mb-4 text-white/80">11. CONTACT US</h2>
              <p className="text-white/70">
                If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
              </p>
              <div className="mt-4 space-y-1 text-white/70">
                <p><span className="text-white/80">Email:</span> privacy@neron.guru</p>
                <p><span className="text-white/80">Subject Line:</span> Privacy Policy Inquiry</p>
                <p><span className="text-white/80">Response Time:</span> Within 72 hours</p>
              </div>
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
  );
}; 