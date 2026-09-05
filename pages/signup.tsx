import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthLayout from '../components/AuthLayout';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const SignupPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    loginId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.loginId && (formData.loginId.length < 6 || formData.loginId.length > 12)) {
      newErrors.loginId = 'Login ID must be between 6-12 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: formData.loginId || undefined,
          email: formData.email,
          password: formData.password,
          role: 'user',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setErrors({ general: data.message || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="lg:hidden flex justify-center">
          <Logo />
        </div>

        <div className="space-y-2">
          <div className="hidden lg:block mb-6">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold text-primary-text">Sign Up</h1>
          <p className="text-secondary-text">Create your account to access the system</p>
        </div>

        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-sm text-danger">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              type="text"
              name="loginId"
              placeholder="Login Id (optional)"
              value={formData.loginId}
              onChange={handleInputChange}
              error={errors.loginId}
            />
            <Input
              type="email"
              name="email"
              placeholder="Enter Email Id"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
            />
            <Input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              required
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Re-Enter Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Account...' : 'SIGN UP'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-ai-blue hover:text-blue-700 transition-colors duration-150">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
