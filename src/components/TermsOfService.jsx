export default function TermsOfService() {
  return (
    <div className="py-20 px-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
        Terms of <span className="text-indigo-600">Service</span>
      </h1>
      <p className="text-sm text-slate-400 mb-12">Last updated: March 28, 2026</p>

      <div className="space-y-10 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Brainiacs Clinic Management System ("Service"), you agree
            to be bound by these Terms of Service. If you do not agree with any part of these terms,
            you may not access the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
          <p>
            Brainiacs provides a cloud-based clinic management platform that includes appointment
            scheduling, patient records management, billing, doctor workspaces, and administrative
            tools for clinics.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Accounts</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your credentials</li>
            <li>You must notify us immediately of any unauthorized access to your account</li>
            <li>One person or entity may not maintain more than one account per clinic</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Use the Service for any unlawful or unauthorized purpose</li>
            <li>Attempt to gain unauthorized access to other users' accounts or data</li>
            <li>Upload malicious software or interfere with the Service's infrastructure</li>
            <li>Share patient data outside of authorized clinical workflows</li>
            <li>Resell or redistribute the Service without written consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Ownership</h2>
          <p>
            You retain ownership of all patient and clinic data entered into the platform. Brainiacs
            does not claim ownership over your content. We act solely as a data processor on behalf
            of your organization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Service Availability</h2>
          <p>
            We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled
            maintenance windows will be communicated in advance. We are not liable for downtime
            caused by circumstances beyond our reasonable control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Brainiacs shall not be liable for any indirect,
            incidental, special, or consequential damages arising from the use of or inability to use
            the Service, even if advised of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Termination</h2>
          <p>
            We may suspend or terminate your access if you violate these terms. Upon termination,
            you may request an export of your data within 30 days. After that period, data may be
            permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Material changes will be
            communicated via email or an in-app notification at least 14 days before taking effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Contact</h2>
          <p>
            Questions about these Terms? Reach out at{' '}
            <span className="text-indigo-600 font-medium">legal@brainiacs.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
