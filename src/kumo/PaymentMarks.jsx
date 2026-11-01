import React from 'react';
import { Landmark } from 'lucide-react';
import './payment-marks.css';

export default function PaymentMarks() {
  return <div className="footer-payments">
    <div className="footer-payment-copy"><span>PAYMENT OPTIONS</span><p>Confirm your preferred payment method when you order.</p></div>
    <div className="payment-marks" aria-label="Payment brands and methods">
      <div className="payment-mark" title="Visa"><svg viewBox="0 0 80 48" role="img" aria-label="Visa"><text x="39" y="32" textAnchor="middle" fill="#17357a" fontFamily="Arial, sans-serif" fontSize="27" fontWeight="900" fontStyle="italic" letterSpacing="-2">VISA</text></svg></div>
      <div className="payment-mark" title="Mastercard"><svg viewBox="0 0 80 48" role="img" aria-label="Mastercard"><circle cx="31" cy="21" r="13" fill="#eb001b"/><circle cx="49" cy="21" r="13" fill="#f79e1b"/><path d="M40 11.62a13 13 0 0 1 0 18.76 13 13 0 0 1 0-18.76" fill="#ff5f00"/><text x="40" y="42" textAnchor="middle" fill="#252525" fontFamily="Arial, sans-serif" fontSize="7">mastercard</text></svg></div>
      <div className="payment-mark" title="American Express"><svg viewBox="0 0 80 48" role="img" aria-label="American Express"><rect x="13" y="5" width="54" height="38" rx="3" fill="#226fba"/><g fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900"><text x="40" y="23">AMERICAN</text><text x="40" y="34">EXPRESS</text></g></svg></div>
      <div className="payment-mark payment-bank" title="Bank transfer"><Landmark size={19} strokeWidth={1.6}/><span>BANK<br/>TRANSFER</span></div>
    </div>
  </div>;
}

