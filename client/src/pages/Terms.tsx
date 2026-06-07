import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/register" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm mb-6">
          <ArrowLeft size={16} /> Back to Registration
        </Link>

        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
            <h2 className="text-lg font-semibold">1. Purpose</h2>
            <p>
              PreserveLink is a Cold Chain Stability Tool designed for registered pharmacists in Malaysia. 
              It provides evidence-based stability data to assist in making informed decisions regarding 
              temperature-sensitive medicines after temperature excursions.
            </p>

            <h2 className="text-lg font-semibold">2. User Eligibility</h2>
            <p>
              Only registered pharmacists with a valid Annual Practising Certificate (APC) issued by the 
              Pharmacy Board Malaysia are eligible to use this platform. Users must provide their 
              Pharmacy Registration Number (RPh) and undergo automated verification.
            </p>

            <h2 className="text-lg font-semibold">3. Data Accuracy</h2>
            <p>
              While every effort is made to ensure the accuracy of stability data in this database, 
              PreserveLink and its contributors cannot guarantee that the information is free from errors. 
              Users are strongly advised to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cross-reference critical decisions with original manufacturer documentation</li>
              <li>Consult with the Drug Information Service when in doubt</li>
              <li>Report any suspected inaccuracies to the admin team</li>
            </ul>

            <h2 className="text-lg font-semibold">4. Contribution Policy</h2>
            <p>
              By submitting stability data, contributors confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The information is true, accurate, and sourced from reliable references</li>
              <li>They consent to their name being displayed publicly as the contributor</li>
              <li>They accept sole responsibility for the accuracy of submitted data</li>
              <li>Supporting documentation (emails, letters) must clearly show sender and recipient</li>
            </ul>

            <h2 className="text-lg font-semibold">5. Intellectual Property</h2>
            <p>
              All content on PreserveLink, including the database structure, user interface design, 
              and compiled stability data, is the intellectual property of the Pharmaceutical Services 
              Programme, Ministry of Health Malaysia.
            </p>

            <h2 className="text-lg font-semibold">6. Privacy & Data Protection</h2>
            <p>
              User data is collected and stored in accordance with Malaysian data protection laws. 
              Personal information will not be shared with third parties without consent, except 
              as required by law.
            </p>

            <h2 className="text-lg font-semibold">7. Disclaimer</h2>
            <p>
              PreserveLink is provided "as-is" without warranty of any kind. The Ministry of Health 
              Malaysia, its officers, and contributors shall not be liable for any direct, indirect, 
              incidental, or consequential damages arising from the use of this tool.
            </p>

            <h2 className="text-lg font-semibold">8. Modifications</h2>
            <p>
              These terms may be updated from time to time. Continued use of the platform after 
              changes constitutes acceptance of the revised terms.
            </p>

            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Last updated: January 2026<br />
                Pharmaceutical Services Programme, Ministry of Health Malaysia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
