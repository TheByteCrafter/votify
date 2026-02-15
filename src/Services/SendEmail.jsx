// services/emailService.js
import emailjs from '@emailjs/browser';

// Get your EmailJS configuration from environment variables
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const APPROVAL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_APPROVAL;
const REJECTION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_REJECTION;

class EmailService {
 
  static async sendApprovalEmail(registration) {
    try {
  
      const templateParams = {
        to_name: registration.full_name,
        to_email: registration.email,
        party: registration.party,
        seat: registration.seat,
        county: registration.county || 'N/A',
        constituency: registration.constituency || 'N/A',
        ward: registration.ward || 'N/A',
        approval_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      console.log('📧 Sending approval email to:', registration.email);

      // Send email via EmailJS
      const response = await emailjs.send(
        SERVICE_ID,
        APPROVAL_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Approval email sent successfully:', response);
      return { success: true, response };
      
    } catch (error) {
      console.error('❌ Failed to send approval email:', error);
      return { 
        success: false, 
        error: error.text || error.message || 'Unknown error'
      };
    }
  }

  // Send rejection email
  static async sendRejectionEmail(registration, reason, nextSteps = '') {
    try {
      const templateParams = {
        to_name: registration.full_name,
        to_email: registration.email,
        party: registration.party,
        seat: registration.seat,
        rejection_reason: reason || 'Does not meet the eligibility criteria',
        next_steps: nextSteps || 'You may reapply in the next election cycle',
        review_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      console.log('📧 Sending rejection email to:', registration.email);

      const response = await emailjs.send(
        SERVICE_ID,
        REJECTION_TEMPLATE_ID,
        templateParams
      );

      console.log(' Rejection email sent successfully:', response);
      return { success: true, response };
      
    } catch (error) {
      console.error('❌ Failed to send rejection email:', error);
      return { 
        success: false, 
        error: error.text || error.message || 'Unknown error'
      };
    }
  }

 
  static async sendTestEmail(testEmail) {
    try {
      const templateParams = {
        to_name: 'Test User',
        to_email: testEmail,
        message: 'This is a test email from your election system.',
        date: new Date().toLocaleDateString()
      };

      const response = await emailjs.send(
        SERVICE_ID,
        APPROVAL_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Test email sent:', response);
      return { success: true, response };
      
    } catch (error) {
      console.error('❌ Test email failed:', error);
      return { success: false, error: error.text };
    }
  }
}

export default EmailService;