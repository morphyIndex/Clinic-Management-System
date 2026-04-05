export default function PrivacyPolicy() {
  return (
    <div className="py-20 px-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
        Privacy <span className="text-indigo-600">Policy</span>
      </h1>
      <p className="text-sm text-slate-400 mb-12">Last updated: March 28, 2026</p>

      <div className="space-y-10 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
          <p>
            Brainiacs collects information you provide directly, such as when you create an account,
            book appointments, or contact our support team. This may include your name, email address,
            phone number, date of birth, and medical-related information necessary for clinic operations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>To provide and maintain our clinic management services</li>
            <li>To manage appointments, billing, and patient records</li>
            <li>To communicate with you about your account or services</li>
            <li>To improve, personalize, and expand our platform</li>
            <li>To comply with legal and regulatory obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Protection & Security</h2>
          <p>
            We implement industry-standard security measures including encryption at rest and in transit,
            role-based access controls, and regular security audits. All patient health information is
            handled in accordance with applicable healthcare data protection regulations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Sharing</h2>
          <p>
            We do not sell your personal information. Data may be shared only with authorized clinic
            staff within your healthcare provider's organization, or as required by law. Third-party
            service providers who assist in our operations are bound by strict confidentiality agreements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. You may also request
            a copy of the data we hold about you. To exercise any of these rights, please contact us
            at <span className="text-indigo-600 font-medium">support@brainiacs.com</span>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Cookies</h2>
          <p>
            We use essential cookies to keep you signed in and maintain your session. We do not use
            third-party advertising cookies. You can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any significant
            changes by posting a notice on our platform. Continued use of Brainiacs after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <span className="text-indigo-600 font-medium">support@brainiacs.com</span> or call{' '}
            <span className="text-indigo-600 font-medium">+1 (234) 567-890</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
