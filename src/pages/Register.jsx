// src/pages/Register.jsx
import React, { useState, useMemo } from 'react';
import backIcon from '../assets/backIcon.svg';
import nextIcon from '../assets/nextIcon.svg';
import PersonalDetails from '../components/PersonalDetails.jsx';
import AccountSetup from '../components/AccountSetup.jsx';
import ReviewYourAccount from '../components/ReviewYourAccount.jsx';
import success from '../assets/success.svg';
import x from '../assets/x.svg';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../services/authService";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const Register = () => {
  const formTemplate = useMemo(() => ({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    contact_number: '',
    street: '',
    barangay: '',
    block: '',
    lot: '',
    city: '',
    province: '',
    zipC: '',
    country: '',
    email: '',
    password: '',
    cPassword: '',
    password_confirmation: '',
  }), []);

  const [formData, setFormData] = useState(formTemplate);
  const [formErrors, setFormErrors] = useState({});
  const [step, setStep] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cPassword') {
      setFormData(prev => ({ ...prev, cPassword: value, password_confirmation: value }));
    } else if (name === 'password_confirmation') {
      setFormData(prev => ({ ...prev, password_confirmation: value, cPassword: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const buildFullAddress = () => {
    return [
      formData.block, formData.lot, formData.street, formData.barangay,
      formData.city, formData.province, formData.zipC, formData.country
    ].filter(value => value && value.trim() !== '').join(', ');
  };

  // After registration, go to /login — Login.jsx will read sessionStorage and redirect to checkout if needed.
  // We do NOT clear sessionStorage here — Login.jsx owns that step.
  const redirectAfterRegister = () => {
    const hasPendingCheckout = !!sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    navigate('/login', {
      state: hasPendingCheckout
        ? { fromRegister: true }   // Login.jsx will detect sessionStorage itself
        : undefined,
    });
  };

  const handleSubmitToBackend = async () => {
    try {
      setFormErrors({});
      if ((formData.password || '') !== (formData.cPassword || '')) {
        setFormErrors({ password_confirmation: ['Password confirmation does not match.'] });
        alert('Password confirmation does not match.');
        return;
      }
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        date_of_birth: formData.date_of_birth,
        contact_number: formData.contact_number,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.cPassword || formData.password_confirmation,
        address: buildFullAddress()
      };
      const response = await axios.post("http://127.0.0.1:8000/api/account_registration", payload);
      console.log("Registration success:", response.data);
      setShowModal(true);
      setTimeout(() => { setShowModal(false); redirectAfterRegister(); }, 2000);
    } catch (error) {
      const data = error.response?.data;
      console.error("Registration error:", data || error.message);
      if (data?.errors) {
        setFormErrors(data.errors);
        const firstKey = Object.keys(data.errors)[0];
        alert(data.errors[firstKey]?.[0] || data.message || "Registration failed.");
      } else {
        alert(data?.message || "Registration failed. Check your inputs.");
      }
    }
  };

  const handleNext = () => {
    let requiredFields = [];
    if (step === 1) {
      requiredFields = ['first_name', 'last_name', 'date_of_birth', 'contact_number',
        'street', 'barangay', 'block', 'lot', 'city', 'province', 'zipC', 'country'];
    } else if (step === 2) {
      requiredFields = ['email', 'password', 'cPassword'];
    }
    const emptyFields = requiredFields.filter(field => !(formData[field] || '').toString().trim());
    if (emptyFields.length > 0) { alert('Please fill in all required fields before proceeding.'); return; }
    if (step === 2) {
      if ((formData.password || '') !== (formData.cPassword || '')) {
        alert('Password and confirmation do not match.');
        setFormErrors({ password_confirmation: ['Password confirmation does not match.'] });
        return;
      }
      if ((formData.password || '').length < 6) {
        alert('Password must be at least 6 characters.');
        setFormErrors({ password: ['Password must be at least 6 characters.'] });
        return;
      }
    }
    if (step < 3) { setStep(step + 1); } else { handleSubmitToBackend(); }
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const renderStep = () => {
    switch (step) {
      case 1: return <PersonalDetails formData={formData} onChange={handleChange} formErrors={formErrors} />;
      case 2: return <AccountSetup formData={formData} onChange={handleChange} formErrors={formErrors} />;
      case 3: return <ReviewYourAccount formData={formData} />;
      default: return null;
    }
  };

  const hasPendingCheckout = !!sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
  const hasInquiryIntent = sessionStorage.getItem("stickify_inquiry_intent") === "true";

  return (
    <div className="flex flex-col">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center bg-black/40 justify-center">
          <div className="flex flex-col items-center bg-white rounded-[10px] shadow-lg max-w-[450px] w-full relative py-20">
            <button onClick={() => { setShowModal(false); redirectAfterRegister(); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 cursor-pointer">
              <img src={x} alt="" />
            </button>
            <div className="flex flex-col gap-20 items-center">
              <div className="flex gap-3 justify-center">
                <h2 className="text-xl font-bold mb-4 text-[25px]">Registration Successful!</h2>
                <img src={success} alt="" className="h-7 w-auto flex mt-1" />
              </div>
              <p className="text-sm text-gray-500 text-center -mt-16">Please check your email to verify your account.</p>
              <button onClick={() => { setShowModal(false); redirectAfterRegister(); }}
                className="cursor-pointer bg-[#00B731] hover:bg-green-600 text-white p-2 px-5 w-auto rounded-[7px] font-semibold whitespace-nowrap">
                {hasPendingCheckout ? "Continue to Checkout" : (hasInquiryIntent ? "Continue to Inquiries" : "Login to Stickify")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-30 mb-5">
        <h1 className="text-2xl font-bold">Let's get you started</h1>
        <p className="text-gray-600">Enter the details to get going</p>
      </div>

      {/* Google Login Button */}
      <div className="flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                await loginWithGoogle(credentialResponse.credential);
                window.location.href = "/customer-dashboard";
              } catch (err) {
                console.error("Google Login Error:", err);
                alert("Google Sign-In failed.");
              }
            }}
            onError={() => alert("Google Login Failed")}
            useOneTap
            theme="outline"
            shape="pill"
            width="320px"
          />
        </div>

        {/* Separator */}
        <div className="flex items-center mb-6 w-full max-w-md">
          <div className="w-full border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 font-medium uppercase tracking-wider">or</span>
          <div className="w-full border-t border-gray-300"></div>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-2.5">
        <div className="flex items-center space-x-2">
          <div className={`flex items-center justify-center w-6 h-6 border-2 p-3 rounded-full font-medium ${step >= 1 ? 'border-[#413491] text-black' : 'border-gray-400 text-gray-400'}`}>1</div>
          <p className={`text-sm font-semibold ${step >= 1 ? 'text-[#413491]' : 'text-gray-400'}`}>Personal Details</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-32 h-[2px] ${step >= 2 ? 'bg-[#413491]' : 'bg-gray-400'}`}></div>
          <div className={`flex items-center justify-center w-6 h-6 border-2 p-3 rounded-full font-medium ${step >= 2 ? 'border-[#413491] text-black' : 'border-gray-400 text-gray-400'}`}>2</div>
          <p className={`text-sm font-semibold ${step >= 2 ? 'text-[#413491]' : 'text-gray-400'}`}>Account Setup</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-32 h-[2px] ${step === 3 ? 'bg-[#413491]' : 'bg-gray-400'}`}></div>
          <div className={`flex items-center justify-center w-6 h-6 border-2 p-3 rounded-full font-medium ${step === 3 ? 'border-[#413491] text-black' : 'border-gray-400 text-gray-400'}`}>3</div>
          <p className={`text-sm font-semibold ${step === 3 ? 'text-[#413491]' : 'text-gray-400'}`}>Review your account</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-10 bg-gray-100">
        {renderStep()}
        <div className="flex justify-between mt-9 w-full max-w-[1020px]">
          <button onClick={handleBack} disabled={step === 1}
            className="flex items-center gap-2 text-white font-semibold bg-black p-2.5 px-5 rounded-[8px] cursor-pointer">
            <img src={backIcon} alt="Back" className="w-5 h-5" />Back
          </button>
          <button onClick={handleNext}
            className="flex items-center gap-2 text-white font-semibold bg-black p-2.5 px-5 rounded-[8px] cursor-pointer">
            {step === 3 ? 'Finish' : 'Next'}
            <img src={nextIcon} alt="Next" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;