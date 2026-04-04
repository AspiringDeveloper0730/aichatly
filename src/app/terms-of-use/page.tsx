
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsOfUsePage() {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 mt-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">TERMS OF USE</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last Updated: {today}
            </p>
            
            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. General Information</h2>
                <p className="text-white/80 leading-relaxed">
                  These Terms of Use apply to visitors and users ("you", "user") using the AIChatly platform ("Platform", "we", "service"). The Platform is currently operated as an individual project and does not have official company registration. By using our services, you agree to these terms. If you do not agree, please do not use the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>AIChatly is an online platform that allows users to benefit from digital services such as AI-powered chat, content creation, and character creation.</li>
                  <li>The Platform reserves the right to continuously improve, modify, or terminate its services.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. User Account</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  Creating an account may be necessary for some features. As a user:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>The information you provide must be accurate.</li>
                  <li>You are responsible for your account security.</li>
                  <li>Transactions made through your account are considered your own.</li>
                  <li>If you notice any suspicious activity, you must contact us immediately.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Age Limit</h2>
                <p className="text-white/80 leading-relaxed">
                  The platform is for users aged 18 and over. We do not knowingly collect data from or provide services to individuals under the age of 16.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Unacceptable Uses</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The following behaviors are prohibited while using the platform:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Producing or sharing illegal content</li>
                  <li>Violating the rights of others (copyright, privacy, etc.)</li>
                  <li>Producing hate speech, violence, harassment, or harmful content</li>
                  <li>Content containing child abuse or sexual exploitation</li>
                  <li>Attempting to manipulate the system</li>
                  <li>Performing technical attacks that will harm the service</li>
                  <li>Spam or abuse</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  Accounts that violate these rules may be suspended or deleted without warning.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Content Responsibility</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The user is responsible for the content created through the platform. The Platform:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Does not have to check user content beforehand.</li>
                  <li>Does not guarantee the accuracy of the content.</li>
                  <li>Does not guarantee that AI outputs will be error-free.</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  Users must evaluate the suitability of the created content themselves before using it.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
                <p className="text-white/80 leading-relaxed">
                  The software, design, logo, interface, and infrastructure of the Platform belong to the Platform and cannot be used without permission. The copyright of the content created by users belongs to the user; however, the Platform may technically process this content in order to provide the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Service Continuity</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The Platform:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Does not guarantee that the service will be uninterrupted.</li>
                  <li>May temporarily suspend service due to technical maintenance.</li>
                  <li>Reserves the right to change features.</li>
                  <li>Cannot be held responsible for data loss that may arise from such changes.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
                <p className="text-white/80 leading-relaxed mb-3">
                  The platform is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Incorrect or incomplete AI outputs</li>
                  <li>Service interruptions</li>
                  <li>User errors</li>
                  <li>Problems arising from third-party services</li>
                  <li>Damages arising from the use of generated content</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-3">
                  The platform is provided "as is" and no express or implied warranties are given.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Account Suspension and Termination</h2>
                <p className="text-white/80 leading-relaxed">
                  The platform may suspend or delete an account in cases of serious breaches or security risks. The user will be notified in advance where possible.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Changes</h2>
                <p className="text-white/80 leading-relaxed">
                  These Terms of Use may be updated from time to time. Updated terms take effect as soon as they are published on this page. You will be notified of significant changes via email or the site. Your continued use of the platform means you accept the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
                <p className="text-white/80 leading-relaxed">
                  For questions regarding the Terms of Use:
                </p>
                <ul className="list-none space-y-2 text-white/80 mt-3">
                  <li>Email: info@aichatly.app</li>
                  <li>Website: aichatly.app</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
