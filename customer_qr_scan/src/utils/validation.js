/**
 * Shared validation utilities for the Smart QR Restaurant Customer Portal
 */

export const validateEmail = (email) => {
    if (!email) return { isValid: false, error: 'Email cannot be empty' };
    if (email.length < 5 || email.length > 254) return { isValid: false, error: 'Email must be between 5 and 254 characters' };
    if (/\s/.test(email)) return { isValid: false, error: 'Email cannot contain spaces' };
    
    // Standard pattern: name@domain.tld
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(email)) return { isValid: false, error: 'Invalid email format (e.g., user@example.com)' };
    
    // Domain validation (basic check for common fake patterns)
    const domain = email.split('@')[1];
    if (domain.split('.').some(part => part.length < 2)) return { isValid: false, error: 'Invalid domain structure' };
    
    return { isValid: true };
};

export const validatePassword = (password) => {
    if (!password) return { isValid: false, error: 'Password cannot be empty' };
    if (password.trim() !== password) return { isValid: false, error: 'Password cannot have spaces at the beginning or end' };
    
    const weakPasswords = ['123456', 'password', 'admin', 'qwerty'];
    if (weakPasswords.includes(password.toLowerCase())) {
        return { isValid: false, error: 'This password is too common and weak' };
    }

    const requirements = {
        length: password.length >= 8 && password.length <= 16,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[@$!%*?&#]/.test(password),
    };
    
    const isValid = Object.values(requirements).every(Boolean);
    
    let errorMsg = '';
    if (!requirements.length) errorMsg = 'Password must be 8-16 characters';
    else if (!requirements.uppercase) errorMsg = 'Must include at least one uppercase letter';
    else if (!requirements.lowercase) errorMsg = 'Must include at least one lowercase letter';
    else if (!requirements.number) errorMsg = 'Must include at least one number';
    else if (!requirements.special) errorMsg = 'Must include at least one special character (@$!%*?&#)';

    return { isValid, requirements, error: errorMsg };
};

export const validateFullName = (name) => {
    return name.trim().length >= 3;
};
