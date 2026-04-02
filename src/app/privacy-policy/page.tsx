
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">PRIVACY POLICY</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last Updated: {currentDate}
            </p>
            
            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. General Information</h2>
                <p className="text-white/80 leading-relaxed">
                  This Privacy Policy applies to visitors and users ("you" or "user") using the AIChatly platform (hereinafter referred to as the "Platform" or "we"). The Platform is currently operated as an individual project and does not have a formal company registration. By using our services, you agree to this policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Information Collected</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The following information may be collected while using the service:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
                  <li>Information you provide when creating an account (email, username)</li>
                  <li>System usage data (device type, browser information, IP address, session duration)</li>
                  <li>Settings, preferences entered during character creation, and files uploaded (PDF, text, etc.)</li>
                  <li>Technical log records (for error correction and security)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Children's Data</h2>
                <p className="text-white/80 leading-relaxed">
                  The platform is for users aged 18 and over. We do not knowingly collect data from children under 16. If such a situation is detected, the data will be deleted immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Chat Content and Privacy</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  Chat content is not manually read or reviewed. Data is processed automatically only for the purposes of:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
                  <li>Service operation</li>
                  <li>Response generation</li>
                  <li>Technical performance and security</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  There is no human intervention.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Purposes of Data Use</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The collected data is used for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
                  <li>Providing and operating the service</li>
                  <li>Improving user experience</li>
                  <li>Ensuring security</li>
                  <li>Resolving technical issues</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  The data is not sold for advertising purposes or shared with third parties.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  We work with the following third-party services for service delivery (all subject to their own privacy policies):
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
                  <li>Zoer.ai (platform infrastructure and development)</li>
                  <li>OpenAI (GPT models and visual production)</li>
                  <li>Vercel / Cloudflare (hosting, security and performance)</li>
                  <li>Stripe (payment processing – to be activated in the future)</li>
                  <li>Google Analytics (anonymous usage statistics – optional)</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  If there are any infrastructure changes in the future (e.g., switching to another hosting provider), this policy will be updated and users will be informed.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h2>
                <p className="text-white/80 leading-relaxed">
                  Currently, our platform does not use cookies or similar tracking technologies. If cookie usage begins in the future, a separate Cookie Policy will be published and user consent will be obtained. Currently, no cookies are collected, so you don't need to worry about this.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Data Security</h2>
                <p className="text-white/80 leading-relaxed">
                  User data is stored on secure servers and technical measures are taken against unauthorized access. However, no data transmitted over the internet is 100% secure; therefore, act at your own risk.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Data Retention Period</h2>
                <p className="text-white/80 leading-relaxed">
                  Data is stored for as long as the account is active. When the account is deleted or requested, data is permanently deleted within 30 days (unless legally required).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. User Rights</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
                  <li>Access</li>
                  <li>Correction</li>
                  <li>Deletion</li>
                  <li>Restrict processing of your data</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  You can send your requests to support@aichatly.app (or an email address we will specify later). The response time is 30 days.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Policy Updates</h2>
                <p className="text-white/80 leading-relaxed">
                  This Privacy Policy may be updated as needed. The current version is always published on the website. Significant changes will be notified.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
                <p className="text-white/80 leading-relaxed">
                  For privacy-related questions:<br />
                  support@aichatly.app (or your official email address that you will create in the future)
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
