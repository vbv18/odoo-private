import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthLayout from '../components/AuthLayout';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ loginId: '', password: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: formData.loginId,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setErrors({ general: data.message || 'Invalid Login Id or Password' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-semibold text-primary-text">Sign In</h1>
          <p className="text-secondary-text">Enter your credentials to access the system</p>
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
              placeholder="Enter Login Id"
              value={formData.loginId}
              onChange={handleInputChange}
              required
            />
            <Input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing In...' : 'SIGN IN'}
          </Button>
        </form>

        <div className="text-center text-sm space-y-2">
          <div>
            <Link href="/forgot-password" className="text-ai-blue hover:text-blue-700 transition-colors duration-150">
              Forgot Password
            </Link>
            <span className="text-secondary-text mx-2">|</span>
            <Link href="/create-account" className="text-ai-blue hover:text-blue-700 transition-colors duration-150">
              Create Account
            </Link>
          </div>
          <div>
            <Link href="/signup" className="text-ai-blue hover:text-blue-700 transition-colors duration-150">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
